#!/usr/bin/env python3

import os
import sys
from PIL import Image
import glob

def resize_images(folder_path, size):
    """
    Resize all PNG images in the specified folder to the given size.
    
    Args:
        folder_path (str): Path to the folder containing PNG images
        size (int): Target size for both width and height
    """
    # Ensure the folder exists
    if not os.path.exists(folder_path):
        print(f"Error: Folder '{folder_path}' does not exist.")
        return
    
    # Find all PNG files in the folder
    png_pattern = os.path.join(folder_path, "*.png")
    png_files = glob.glob(png_pattern)
    
    if not png_files:
        print(f"No PNG files found in '{folder_path}'.")
        return
    
    print(f"Found {len(png_files)} PNG files to resize to {size}x{size}...")
    
    processed = 0
    for png_file in png_files:
        try:
            # Open the image
            with Image.open(png_file) as img:
                # Resize the image
                resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
                
                # Save back to the same file (in-place)
                resized_img.save(png_file, "PNG")
                
                print(f"Resized: {os.path.basename(png_file)}")
                processed += 1
                
        except Exception as e:
            print(f"Error processing {png_file}: {e}")
    
    print(f"Successfully resized {processed} images.")

def main():
    # Check command line arguments
    if len(sys.argv) != 3:
        print("Usage: python3 resize.py <folder_path> <size>")
        print("Example: python3 resize.py ./images 256")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    
    try:
        size = int(sys.argv[2])
        if size <= 0:
            raise ValueError("Size must be a positive integer")
    except ValueError as e:
        print(f"Error: Invalid size '{sys.argv[2]}'. Size must be a positive integer.")
        sys.exit(1)
    
    resize_images(folder_path, size)

if __name__ == "__main__":
    main()