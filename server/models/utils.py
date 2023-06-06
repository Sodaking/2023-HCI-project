import base64
import numpy as np
from PIL import Image
import io

def encode_image_to_base64(image):
    
    img = Image.fromarray(image)
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_data = img_io.getvalue()
    encoded_image = "data:image/jpg;base64," + base64.b64encode(img_data).decode('utf-8')
    

    return encoded_image
