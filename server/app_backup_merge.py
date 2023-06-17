from flask import Flask, request, send_from_directory, make_response, jsonify
from keras.preprocessing import image
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
from keras.models import Model
from PIL import Image, ImageDraw
from flask_cors import CORS, cross_origin
import numpy as np
import base64
import os
import ssl
import pickle
from scipy.spatial import distance
import time

from models.SAM import ImageProcessor
from models.utils import encode_image_to_base64


app = Flask(__name__)
CORS(app)
ssl._create_default_https_context = ssl._create_unverified_context

image_processor = ImageProcessor()

base_model = ResNet50(weights='imagenet')
model = Model(inputs=base_model.input, outputs=base_model.get_layer('avg_pool').output)
print("Model loaded successfully")
dirs = ['../data/floors', '../data/wallpapers']
print("starting script...")
def get_image_features(image_path):
    img = image.load_img(image_path, target_size=(224, 224))
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    features = model.predict(x)
    return features[0]

def preprocess_images(dir):
    image_dataset = {}
    for filename in os.listdir(dir):
        if filename.endswith(".jpg") or filename.endswith(".png"): 
            file_path = os.path.join(dir, filename)
            image_dataset[file_path] = get_image_features(file_path)
            print(file_path + ": " + str(image_dataset[file_path]))

    with open(f'{dir}_features.pkl', 'wb') as f:
        pickle.dump(image_dataset, f)

    return image_dataset
print("before preprocessing...")
image_datasets = {}

for dir in dirs:
    if not os.path.isfile(f'{dir}_features.pkl') or os.path.getmtime(f'{dir}_features.pkl') < os.path.getmtime(dir):
        image_datasets[dir] = preprocess_images(dir)
    else:
        with open(f'{dir}_features.pkl', 'rb') as f:
            image_datasets[dir] = pickle.load(f)

print("preprocessing done...")
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

        with open(filename, "wb") as fh:
            fh.write(base64.decodebytes(image.split(',')[1].encode()))
        message = f"Interior image uploaded successfully as {filename}\n"
        print(message)
        messages += message
        
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

    return {"message": "Points saved", "masked_image": masked_image, "mask_image": mask_image}, 200

@app.route('/apply_texture', methods=['POST'])
def apply_texture():
    mask_image = request.json['mask_image']
    sessionId = request.json['sessionId']
    texture = request.json['texture']
    
    ## TODO: apply texture to masked image
    return {"message": ""}, 200

@app.route('/similar/floors', methods=['POST'])
def find_similar_floors():
    return find_similar('../data/floors')

@app.route('/similar/wallpapers', methods=['POST'])
def find_similar_wallpapers():
    return find_similar('../data/wallpapers')

def find_similar(dir):
    file = request.files['file']
    file_path = os.path.join('../data/temp', file.filename)
    file.save(file_path)
    uploaded_features = get_image_features(file_path)
    print("Processed image: ", file_path)
    os.remove(file_path)

    similarities = {}
    image_dataset = image_datasets[dir]
    for img_path, img_features in image_dataset.items():
        dist = distance.euclidean(uploaded_features, img_features)
        similarities[img_path] = dist

    sorted_similarities = sorted(similarities.items(), key=lambda item: item[1])

    return {'similar_images': [x[0] for x in sorted_similarities[:4]]}

@app.route('/data/<path:filename>', methods=['GET'])
def get_image(filename):
    return send_from_directory('../data', filename)

if __name__ == "__main__":
    app.run(host='127.0.0.1', port='5001', debug=True)
    print("Starting the Flask app")