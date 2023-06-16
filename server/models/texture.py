import cv2
import numpy as np
import sys
import os

def tile_texture(mask_path, texture_path, tiling):
    # Load the mask and tile images
    mask = cv2.imread(mask_path, cv2.IMREAD_UNCHANGED)
    texture = cv2.imread(texture_path)

    if(tiling == 1):
        print("Apply texture to mask WITHOUT tiling")
        textured_mask = wo_tiling(mask, texture)
    
    else:
        print("Apply texture to mask WITH tiling (" + str(tiling) + " tiles in a row)")
        textured_mask = with_tiling(mask, texture, 10)
        
    cv2.imwrite("./test/textured_mask.png", textured_mask)
    return textured_mask

def wo_tiling(mask, texture):
    # Extract the alpha channel from the mask image
    mask_alpha = mask[:,:,3]

    # Resize the tile to match the mask dimensions
    texture = cv2.resize(texture, (mask.shape[1], mask.shape[0]), interpolation=cv2.INTER_LINEAR)

    # Create a color image from the mask using the alpha channel
    mask_color = cv2.cvtColor(mask_alpha, cv2.COLOR_GRAY2BGR)

    # Apply the tile texture to the masked region
    textured_mask = np.where(mask_color > 0, texture, mask_color)
    return textured_mask 

def with_tiling(mask, texture, tiling):
    # Calculate the desired texture size based on tiling value
    texture_size = mask.shape[1] // tiling 
    texture_resized = cv2.resize(texture, (texture_size, texture_size))

    vertical_tiling = int(mask.shape[0] // texture_size)

    # Repeat the texture horizontally and vertically
    hconcat_texture = texture_resized

    for i in range(tiling-1):
        hconcat_texture = recursive_hconcat(texture_resized, hconcat_texture)

    vconcat_texture = hconcat_texture
    vtexture_resized = vconcat_texture    
    for i in range(vertical_tiling-1):
        vconcat_texture = recursive_vconcat(vtexture_resized, vconcat_texture)

    tiled_texture = vconcat_texture
    print("tiled texture shape: ", tiled_texture.shape)
    print("original mask shape: ", mask.shape)

    # cv2.imwrite("test/tiled_texture.png", tiled_texture)

    # Extract the alpha channel from the mask image
    mask_alpha = mask[:,:,3]

    # Resize the tile to match the mask dimensions
    resized_tiled_texture = cv2.resize(tiled_texture, (mask.shape[1], mask.shape[0]), interpolation=cv2.INTER_LINEAR)

    # Create a color image from the mask using the alpha channel
    mask_color = cv2.cvtColor(mask_alpha, cv2.COLOR_GRAY2BGR)

    # Apply the tile texture to the masked region
    textured_mask = np.where(mask_color > 0, resized_tiled_texture, mask_color)

    cv2.imwrite("test/textured_mask.png", textured_mask)

    return textured_mask 

def recursive_hconcat(texture, concat_texture):
    return cv2.hconcat([concat_texture, texture])

def recursive_vconcat(texture, concat_texture):
    return cv2.vconcat([concat_texture, texture])

if __name__ == '__main__':
    # Check if the correct number of arguments is provided
    if len(sys.argv) != 5:
        print("Usage: python texture.py {mask image name} {texture image name} {output image name} {tiling}")
        sys.exit(1)

    # Get the command-line arguments
    base_dir = "./test/"
    mask = os.path.join(base_dir, sys.argv[1])
    texture = os.path.join(base_dir, sys.argv[2])
    output_name = os.path.join(base_dir, sys.argv[3])
    tiling = int(sys.argv[4])

    if(tiling < 0): print("Warn: tiling argument should be positive")
    output = tile_texture(mask, texture, tiling)
    
    cv2.imwrite(output_name, output)