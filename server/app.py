from flask import Flask, request, send_from_directory, make_response, jsonify
import base64
from flask_cors import CORS, cross_origin
import os
from PIL import Image, ImageDraw

from models.SAM import ImageProcessor
from models.utils import encode_image_to_base64, encode_image_to_base64_from_path
from models.texture import tile_texture
from models.Similar import FindSimilar


app = Flask(__name__)
CORS(app)

image_processor = ImageProcessor()
find_similar = FindSimilar()
print("SAM loaded successfully")


@app.route('/create_directory', methods=['POST'])
def create_directory():
    sessionId = request.json['sessionId']

    if not os.path.exists(sessionId):
        os.makedirs(sessionId)

    return 'Directory has been created for session ID: ' + sessionId


@app.route('/save_drawing', methods=['POST'])
def save_drawing():
    sessionId = request.json['sessionId']
    image = request.json['image']

    filename = f'{sessionId}/drawing.png'
    
    if image is not None:
        messages = ""

        #save image
        with open(filename, "wb") as fh:
            fh.write(base64.decodebytes(image.split(',')[1].encode()))
        message = f"Interior image uploaded successfully as {filename}\n"
        print(message)
        messages += message

        return {"message": messages}, 200
    else:
        return {"message": "No image found"}, 400
    


@app.route('/upload_interior', methods=['POST'])
def upload_interior():
    sessionId = request.json['sessionId']
    image = request.json['image']

    filename = f'{sessionId}/interior.png'
    
    if image is not None:
        messages = ""

        #save image
        with open(filename, "wb") as fh:
            fh.write(base64.decodebytes(image.split(',')[1].encode()))
        message = f"Interior image uploaded successfully as {filename}\n"
        print(message)
        messages += message
        
        #run sam models
        sam_result = image_processor.segment_image(sessionId)
        sam_result = encode_image_to_base64(sam_result)
        message = f"SAM successfully\n"
        print(message)
        messages += message
        
        return {"message": messages, "sam_result": sam_result}, 200
    else:
        return {"message": "No image found"}, 400
    

@app.route('/save_segment_points', methods=['POST'])
def save_segment_points():
    points = request.json['points']
    sessionId = request.json['sessionId']

    image = Image.open(f'{sessionId}/interior.png')
    draw = ImageDraw.Draw(image)
    for point in points:
        if point['mode'] == 1:
            color = 'green'
        else:
            color = 'red'
            
        draw.ellipse((point['x']-5, point['y']-5, point['x']+5, point['y']+5), fill=color, outline=color)
    image.save(f'{sessionId}/interior_with_points.png')

    masked_image, mask_image = image_processor.segment_image_with_point(sessionId, points)
    masked_image = encode_image_to_base64(masked_image)
    mask_image = encode_image_to_base64(mask_image)
    # image.save(f'{sessionId}/segment_points.png')

    return {"message": "Points saved", "masked_image": masked_image, "mask_image": mask_image}, 200


@app.route('/apply_texture', methods=['POST'])
def apply_texture():
    mask_image = request.json['mask_image']
    sessionId = request.json['sessionId']
    texture = request.json['texture']

    messages = ""

    mask_path = f'{sessionId}/mask_image.png'
    texture_path = f'{sessionId}/texture.png'
    tiling = 15  # texture tiling number

    if texture is None or mask_image is None:
        return {"message": "No texture or mask image found"}, 400

    #save texture
    with open(texture_path, "wb") as fh:
        fh.write(base64.decodebytes(texture.split(',')[1].encode()))

    with open(mask_path, "wb") as fh:
        fh.write(base64.decodebytes(mask_image.split(',')[1].encode()))

    textured_mask = tile_texture(mask_path, texture_path, tiling)
    textured_mask = encode_image_to_base64(textured_mask)

    print("fh type: ", )
    return {"message": "Texture applied mask saved", "textured_mask": textured_mask}, 200

@app.route('/similar', methods=['POST'])
def similar():
    option_type = request.json['type']
    option_type = 'floors' if option_type == 'Floor' else "wallpapers"
    sessionId = request.json['sessionId']
    texture = request.json['texture']

    if texture is None:
        texture_path = None
    else:
        texture_path = f'{sessionId}/similar_texture.png'
        with open(texture_path, "wb") as fh:
            fh.write(base64.decodebytes(texture.split(',')[1].encode()))
    print(texture_path)

    similar_paths = find_similar.get_similar(texture_path, f'data/{option_type}')
    similar_images = []
    for path in similar_paths:
        similar_images.append(encode_image_to_base64_from_path(path))
    return {"message": "Similar images found", "similar_images": similar_images}, 200

@app.route('/data/<path:filename>', methods=['GET'])
def get_image(filename):
    return send_from_directory('data', filename), 200

if __name__ == "__main__":
    app.run(host='127.0.0.1', port='5001', debug=True)