from flask import Flask, request, make_response, jsonify
import base64
from flask_cors import CORS, cross_origin
import os
from models.SAM import ImageProcessor
from models.utils import encode_image_to_base64
from PIL import Image, ImageDraw


app = Flask(__name__)
CORS(app)

image_processor = ImageProcessor()

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

    masked_image = image_processor.segment_image_with_point(sessionId, points)
    masked_image = encode_image_to_base64(masked_image)
    # image.save(f'{sessionId}/segment_points.png')

    return {"message": "Points saved", "masked_image": masked_image}, 200


@app.route('/apply_texture', methods=['POST'])
def apply_texture():
    masked_image = request.json['masked_image']
    sessionId = request.json['sessionId']
    texture = request.json['texture']
    
    ## TODO: apply texture to masked image
    return {"message": ""}, 200


if __name__ == "__main__":
    app.run(host='127.0.0.1', port='5001', debug=True)