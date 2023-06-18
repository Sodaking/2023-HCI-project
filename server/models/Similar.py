
import numpy as np
import pickle
from scipy.spatial import distance
import time
from keras.preprocessing import image
from keras.models import Model
import tensorflow as tf
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
import gc
from keras import backend as K
import torch
import random
import os


class FindSimilar:
  def __init__(self):
    gpus = tf.config.experimental.list_physical_devices('GPU')
    if gpus:
        try:
            # Currently, memory growth needs to be the same across GPUs
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        except RuntimeError as e:
            # Memory growth must be set before GPUs have been initialized
            print(e)
    with tf.device('/GPU:1'):
        self.model = None
        self.image_datasets = {}
        self.dirs = ['data/floors', 'data/wallpapers']

        for dir in self.dirs:
            if self.model == None:
                base_model = ResNet50(weights='imagenet')
                self.model = Model(inputs=base_model.input, outputs=base_model.get_layer('avg_pool').output)
            if not os.path.isfile(f'{dir}_features.pkl') or os.path.getmtime(f'{dir}_features.pkl') < os.path.getmtime(dir):
                
                print('need to processing : ' + str(dir) )
                self.image_datasets[dir] = self.preprocess_images(dir)
                
            else:
                print('no need to processing : ' + str(dir) )
                with open(f'{dir}_features.pkl', 'rb') as f:
                    self.image_datasets[dir] = pickle.load(f)

        print("preprocessing done...")
   
  def get_image_features(self, image_path):
    with tf.device('/GPU:1'):
      img = image.load_img(image_path, target_size=(224, 224))
      x = image.img_to_array(img)
      x = np.expand_dims(x, axis=0)
      x = preprocess_input(x)
      features = self.model.predict(x)
      return features[0]

  def preprocess_images(self, dir):
    with tf.device('/GPU:0'):
      image_dataset = {}
      for filename in os.listdir(dir):
          if filename.endswith(".jpg") or filename.endswith(".png"): 
              file_path = os.path.join(dir, filename)
              image_dataset[file_path] = self.get_image_features(file_path)
              print(file_path + ": " + str(image_dataset[file_path]))

      with open(f'{dir}_features.pkl', 'wb') as f:
          pickle.dump(image_dataset, f)

      return image_dataset



  def get_similar(self, file_path, dir):
    with tf.device('/GPU:0'):
      uploaded_features = []
      if file_path == None:
          return random.sample(list(self.image_datasets[dir].keys()), 4)

      uploaded_features = self.get_image_features(file_path)
      print("Processed image: ", file_path)
    #   os.remove(file_path)

      similarities = {}
      image_dataset = self.image_datasets[dir]
      for img_path, img_features in image_dataset.items():
          dist = distance.euclidean(uploaded_features, img_features)
          similarities[img_path] = dist

      sorted_similarities = sorted(similarities.items(), key=lambda item: item[1])
      return [x[0] for x in sorted_similarities[1:5]]