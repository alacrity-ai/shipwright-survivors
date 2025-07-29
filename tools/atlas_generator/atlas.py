#!/usr/bin/env python3
"""
PNG Atlas Generator
Combines multiple PNG images into a single texture atlas and generates UV coordinates.
"""

import os
import math
from PIL import Image
from typing import List, Tuple, NamedTuple
import argparse

class Rectangle(NamedTuple):
    x: int
    y: int
    width: int
    height: int

class ImageInfo(NamedTuple):
    filename: str
    image: Image.Image
    width: int
    height: int

class AtlasNode:
    def __init__(self, x: int, y: int, width: int, height: int):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.used = False
        self.right = None
        self.down = None

    def insert(self, width: int, height: int) -> 'AtlasNode':
        if self.used:
            # Try inserting into right or down child
            if self.right:
                node = self.right.insert(width, height)
                if node:
                    return node
            if self.down:
                return self.down.insert(width, height)
            return None
        
        # If this node is too small, return None
        if width > self.width or height > self.height:
            return None
        
        # If perfect fit, mark as used and return
        if width == self.width and height == self.height:
            self.used = True
            return self
        
        # Split the node
        self.used = True
        
        # Decide which way to split
        dw = self.width - width
        dh = self.height - height
        
        if dw > dh:
            # Split vertically
            self.right = AtlasNode(self.x + width, self.y, dw, height)
            self.down = AtlasNode(self.x, self.y + height, self.width, dh)
        else:
            # Split horizontally
            self.right = AtlasNode(self.x + width, self.y, dw, self.height)
            self.down = AtlasNode(self.x, self.y + height, width, dh)
        
        return self

def load_images(image_paths: List[str]) -> List[ImageInfo]:
    """Load and validate PNG images."""
    images = []
    for path in image_paths:
        if not os.path.exists(path):
            print(f"Warning: File {path} not found, skipping...")
            continue
        
        try:
            img = Image.open(path).convert("RGBA")
            filename = os.path.basename(path)
            images.append(ImageInfo(filename, img, img.width, img.height))
            print(f"Loaded: {filename} ({img.width}x{img.height})")
        except Exception as e:
            print(f"Error loading {path}: {e}")
    
    return images

def calculate_atlas_size(images: List[ImageInfo]) -> Tuple[int, int]:
    """Calculate initial atlas size based on total area and dimensions."""
    total_area = sum(img.width * img.height for img in images)
    
    # Add some padding (15% extra space)
    total_area = int(total_area * 1.15)
    
    # Get max dimensions to ensure we can fit the largest image
    max_width = max(img.width for img in images)
    max_height = max(img.height for img in images)
    
    # Start with a more rectangular approach
    # Try to make width larger than height for better packing
    aspect_ratio = 1.5  # Width will be 1.5x height initially
    height = int(math.sqrt(total_area / aspect_ratio))
    width = int(total_area / height)
    
    # Ensure we can fit the largest images
    width = max(width, max_width)
    height = max(height, max_height)
    
    # Round up to nearest power of 2 for better GPU compatibility
    width = 2 ** math.ceil(math.log2(width))
    height = 2 ** math.ceil(math.log2(height))
    
    return width, height

def create_atlas(images: List[ImageInfo], padding: int = 2) -> Tuple[Image.Image, List[Tuple[str, Rectangle]]]:
    """Create texture atlas using bin packing algorithm."""
    if not images:
        raise ValueError("No images to process")
    
    # Sort images by height (descending) for better packing
    sorted_images = sorted(images, key=lambda x: x.height, reverse=True)
    
    # Calculate initial atlas size
    atlas_width, atlas_height = calculate_atlas_size(images)
    
    # Try packing with increasing atlas sizes until successful
    max_attempts = 5
    for attempt in range(max_attempts):
        print(f"Attempting atlas size: {atlas_width}x{atlas_height}")
        
        root = AtlasNode(0, 0, atlas_width, atlas_height)
        placements = []
        failed = False
        
        for img_info in sorted_images:
            # Add padding to dimensions
            padded_width = img_info.width + padding * 2
            padded_height = img_info.height + padding * 2
            
            node = root.insert(padded_width, padded_height)
            if node is None:
                print(f"Failed to place {img_info.filename}")
                failed = True
                break
            
            # Store placement (accounting for padding)
            rect = Rectangle(
                node.x + padding,
                node.y + padding,
                img_info.width,
                img_info.height
            )
            placements.append((img_info.filename, rect))
        
        if not failed:
            break
        
        # Increase atlas size for next attempt
        # Try increasing width first, then height
        if attempt % 2 == 0:
            atlas_width *= 2
        else:
            atlas_height *= 2
    
    if failed:
        raise RuntimeError("Could not fit all images in atlas")
    
    # Create the atlas image
    atlas = Image.new("RGBA", (atlas_width, atlas_height), (0, 0, 0, 0))
    
    # Place images in atlas
    image_dict = {img.filename: img.image for img in images}
    final_placements = []
    
    for filename, rect in placements:
        img = image_dict[filename]
        atlas.paste(img, (rect.x, rect.y))
        final_placements.append((filename, rect))
        print(f"Placed {filename} at ({rect.x}, {rect.y})")
    
    return atlas, final_placements

def trim_atlas_to_used_area(atlas: Image.Image, placements: List[Tuple[str, Rectangle]]) -> Tuple[Image.Image, int, int]:
    """Trim atlas to only the used area and return new dimensions."""
    if not placements:
        return atlas, atlas.width, atlas.height
    
    # Find the actual bounds of all placed images
    min_x = min(rect.x for _, rect in placements)
    min_y = min(rect.y for _, rect in placements)
    max_x = max(rect.x + rect.width for _, rect in placements)
    max_y = max(rect.y + rect.height for _, rect in placements)
    
    # Add a small border
    border = 2
    actual_width = max_x - min_x + border * 2
    actual_height = max_y - min_y + border * 2
    
    # Make sure dimensions are even numbers (good for compression)
    actual_width = (actual_width + 1) // 2 * 2
    actual_height = (actual_height + 1) // 2 * 2
    
    # Crop the atlas to the used area
    crop_box = (min_x - border, min_y - border, min_x - border + actual_width, min_y - border + actual_height)
    trimmed_atlas = atlas.crop(crop_box)
    
    print(f"Trimmed atlas from {atlas.width}x{atlas.height} to {actual_width}x{actual_height}")
    
    return trimmed_atlas, actual_width, actual_height

def update_placements_for_trim(placements: List[Tuple[str, Rectangle]], offset_x: int, offset_y: int) -> List[Tuple[str, Rectangle]]:
    """Update placement coordinates after trimming the atlas."""
    updated_placements = []
    
    for filename, rect in placements:
        # Adjust coordinates by the trim offset
        new_rect = Rectangle(
            rect.x - offset_x,
            rect.y - offset_y,
            rect.width,
            rect.height
        )
        updated_placements.append((filename, new_rect))
    
    return updated_placements

def generate_uv_coordinates(placements: List[Tuple[str, Rectangle]], atlas_width: int, atlas_height: int) -> str:
    """Generate UV coordinates text file content."""
    lines = []
    lines.append("# Texture Atlas UV Coordinates")
    lines.append(f"# Atlas Size: {atlas_width}x{atlas_height}")
    lines.append("# Format: filename x y width height u_min v_min u_max v_max")
    lines.append("")
    
    for filename, rect in placements:
        # Calculate UV coordinates (0.0 to 1.0)
        u_min = rect.x / atlas_width
        v_min = rect.y / atlas_height
        u_max = (rect.x + rect.width) / atlas_width
        v_max = (rect.y + rect.height) / atlas_height
        
        line = f"{filename} {rect.x} {rect.y} {rect.width} {rect.height} {u_min:.6f} {v_min:.6f} {u_max:.6f} {v_max:.6f}"
        lines.append(line)
    
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="Combine PNG images into a texture atlas")
    parser.add_argument("images", nargs="+", help="PNG image files to combine")
    parser.add_argument("-o", "--output", default="atlas", help="Output filename prefix (default: atlas)")
    parser.add_argument("-p", "--padding", type=int, default=2, help="Padding between images (default: 2)")
    
    args = parser.parse_args()
    
    try:
        # Load images
        print("Loading images...")
        images = load_images(args.images)
        
        if not images:
            print("No valid images found!")
            return
        
        # Create atlas
        print("\nCreating atlas...")
        atlas, placements = create_atlas(images, args.padding)
        
        # Trim atlas to actual used size
        print("Trimming atlas to used area...")
        
        # Calculate trim offset
        min_x = min(rect.x for _, rect in placements) - 2  # Account for border
        min_y = min(rect.y for _, rect in placements) - 2
        
        # Trim the atlas and get new dimensions
        trimmed_atlas, final_width, final_height = trim_atlas_to_used_area(atlas, placements)
        
        # Update placements for the trimmed atlas
        final_placements = update_placements_for_trim(placements, min_x, min_y)
        
        # Save atlas image
        atlas_filename = f"{args.output}.png"
        trimmed_atlas.save(atlas_filename, "PNG")
        print(f"\nAtlas saved as: {atlas_filename}")
        print(f"Final atlas size: {final_width}x{final_height}")
        
        # Generate and save UV coordinates
        uv_content = generate_uv_coordinates(final_placements, final_width, final_height)
        uv_filename = f"{args.output}_uv.txt"
        
        with open(uv_filename, "w") as f:
            f.write(uv_content)
        
        print(f"UV coordinates saved as: {uv_filename}")
        print(f"\nSuccessfully processed {len(final_placements)} images")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()

# Basic usage
# python atlas_generator.py image1.png image2.png image3.png

# With custom output name and padding
# python atlas_generator.py -o my_atlas -p 4 *.png

# Process all PNGs in current directory
# python atlas.py *.png