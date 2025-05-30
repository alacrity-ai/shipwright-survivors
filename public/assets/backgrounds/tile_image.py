#!/usr/bin/env python3
"""
Make any image seamlessly tileable using various methods.
Requires: pip install pillow numpy
"""

import argparse
import numpy as np
from PIL import Image, ImageFilter
import os
import sys

def make_tileable_offset(image):
    """
    Method 1: Offset method - shifts image by half width/height and blends seams
    Works well for textures without obvious repeating patterns
    """
    width, height = image.size
    
    # Convert to numpy array for easier manipulation
    img_array = np.array(image)
    
    # Create offset version (shift by half width/height)
    offset_array = np.roll(img_array, width // 2, axis=1)  # horizontal shift
    offset_array = np.roll(offset_array, height // 2, axis=0)  # vertical shift
    
    # Blend the original and offset images
    # Use a gradient mask to blend seams
    blend_factor = 0.5
    result = (img_array * blend_factor + offset_array * (1 - blend_factor)).astype(np.uint8)
    
    return Image.fromarray(result)

def make_tileable_mirror(image):
    """
    Method 2: Mirror method - creates seamless tiles by mirroring edges
    Good for organic textures like grass, clouds, etc.
    """
    width, height = image.size
    
    # Create a new image 2x the size
    new_width, new_height = width * 2, height * 2
    result = Image.new(image.mode, (new_width, new_height))
    
    # Original image (top-left)
    result.paste(image, (0, 0))
    
    # Horizontal flip (top-right)
    result.paste(image.transpose(Image.FLIP_LEFT_RIGHT), (width, 0))
    
    # Vertical flip (bottom-left)
    result.paste(image.transpose(Image.FLIP_TOP_BOTTOM), (0, height))
    
    # Both flips (bottom-right)
    result.paste(image.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM), 
                (width, height))
    
    return result

def make_tileable_edge_blend(image):
    """
    Method 3: Edge blending - blends opposite edges together
    Most sophisticated method, works well for most image types
    """
    width, height = image.size
    img_array = np.array(image).astype(np.float64)
    
    # Create blend masks for edges
    blend_width = min(width, height) // 8  # Use 1/8 of smallest dimension for blend zone
    
    # Horizontal blending (left and right edges)
    for y in range(height):
        for x in range(blend_width):
            # Blend factor from 0 to 1 across the blend zone
            factor = x / blend_width
            
            # Left edge: blend with right edge
            left_pixel = img_array[y, x]
            right_pixel = img_array[y, width - blend_width + x]
            img_array[y, x] = left_pixel * factor + right_pixel * (1 - factor)
            
            # Right edge: blend with left edge
            right_pixel = img_array[y, width - 1 - x]
            left_pixel = img_array[y, blend_width - 1 - x]
            img_array[y, width - 1 - x] = right_pixel * factor + left_pixel * (1 - factor)
    
    # Vertical blending (top and bottom edges)
    for x in range(width):
        for y in range(blend_width):
            # Blend factor from 0 to 1 across the blend zone
            factor = y / blend_width
            
            # Top edge: blend with bottom edge
            top_pixel = img_array[y, x]
            bottom_pixel = img_array[height - blend_width + y, x]
            img_array[y, x] = top_pixel * factor + bottom_pixel * (1 - factor)
            
            # Bottom edge: blend with top edge
            bottom_pixel = img_array[height - 1 - y, x]
            top_pixel = img_array[blend_width - 1 - y, x]
            img_array[height - 1 - y, x] = bottom_pixel * factor + top_pixel * (1 - factor)
    
    return Image.fromarray(img_array.astype(np.uint8))

def make_tileable_patch_match(image):
    """
    Method 4: Simple patch matching - fills edges with patches from opposite sides
    Quick and often effective method
    """
    width, height = image.size
    img_array = np.array(image)
    
    patch_size = min(width, height) // 16
    
    # Copy patches from opposite edges
    # Left edge gets patches from right side
    img_array[:, :patch_size] = img_array[:, -patch_size*2:-patch_size]
    
    # Right edge gets patches from left side  
    img_array[:, -patch_size:] = img_array[:, patch_size:patch_size*2]
    
    # Top edge gets patches from bottom side
    img_array[:patch_size, :] = img_array[-patch_size*2:-patch_size, :]
    
    # Bottom edge gets patches from top side
    img_array[-patch_size:, :] = img_array[patch_size:patch_size*2, :]
    
    return Image.fromarray(img_array)

def main():
    parser = argparse.ArgumentParser(description='Make images seamlessly tileable')
    parser.add_argument('input', help='Input image file')
    parser.add_argument('-o', '--output', help='Output image file (default: input_tileable.ext)')
    parser.add_argument('-m', '--method', choices=['offset', 'mirror', 'blend', 'patch'], 
                       default='blend', help='Tiling method to use')
    parser.add_argument('-s', '--show-preview', action='store_true', 
                       help='Show a 2x2 tiled preview')
    
    args = parser.parse_args()
    
    # Validate input file
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found")
        sys.exit(1)
    
    # Generate output filename if not provided
    if not args.output:
        name, ext = os.path.splitext(args.input)
        args.output = f"{name}_tileable{ext}"
    
    try:
        # Load image
        print(f"Loading image: {args.input}")
        image = Image.open(args.input)
        print(f"Image size: {image.size}")
        
        # Apply selected method
        print(f"Applying {args.method} method...")
        if args.method == 'offset':
            result = make_tileable_offset(image)
        elif args.method == 'mirror':
            result = make_tileable_mirror(image)
        elif args.method == 'blend':
            result = make_tileable_edge_blend(image)
        elif args.method == 'patch':
            result = make_tileable_patch_match(image)
        
        # Save result
        print(f"Saving result: {args.output}")
        result.save(args.output)
        
        # Show preview if requested
        if args.show_preview:
            print("Creating 2x2 tiled preview...")
            width, height = result.size
            preview = Image.new(result.mode, (width * 2, height * 2))
            
            # Tile the image 2x2
            for i in range(2):
                for j in range(2):
                    preview.paste(result, (i * width, j * height))
            
            preview_name = args.output.replace('.', '_preview.')
            preview.save(preview_name)
            print(f"Preview saved: {preview_name}")
        
        print("Done!")
        
    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()