import cv2
import torch
import supervision as sv
import numpy as np
from segment_anything import SamPredictor, sam_model_registry, SamAutomaticMaskGenerator
from PIL import Image

class ImageProcessor:
    def __init__(self, model_type="vit_h", checkpoint="sam_vit_h_4b8939.pth"):
        device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
        self.sam = sam_model_registry[model_type](checkpoint=checkpoint)
        self.sam.to(device=device)
        self.mask_generator = SamAutomaticMaskGenerator(self.sam)
        self.mask_annotator = sv.MaskAnnotator()
        self.predictor = SamPredictor(self.sam)

    def segment_image(self, sessionId):
        image_bgr = cv2.imread(f'{sessionId}/interior.png')
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        result = self.mask_generator.generate(image_rgb)
        detections = sv.Detections.from_sam(result)
        annotated_image = self.mask_annotator.annotate(image_bgr, detections)
        cv2.imwrite(f'{sessionId}/sam.jpg', annotated_image)
        return annotated_image
    

    def segment_image_with_point(self, sessionId, points):
        interior_image = cv2.cvtColor(cv2.imread(f'{sessionId}/interior.png'), cv2.COLOR_BGR2RGB)
        self.predictor.set_image(interior_image)

        input_point = []
        input_label = []
        for point in points:
            input_point.append([point['x'], point['y']])
            input_label.append(1 if point['mode'] == 1 else 0)

        masks, scores, logits = self.predictor.predict(
            point_coords=np.array(input_point),
            point_labels=np.array(input_label),
            multimask_output=False,
        )

        for i, (mask, score) in enumerate(zip(masks, scores)):
            color = np.array([30/255, 144/255, 255/255, 0.6])
            h, w = mask.shape[-2:]
            mask = mask.reshape(h, w, 1)
            interior_image = interior_image.astype(np.float32) / 255
            interior_image = np.concatenate([interior_image, np.ones((h, w, 1))], axis=-1)
            

            masked_image = mask * interior_image
            masked_image_uint8 = (masked_image * 255).astype(np.uint8)
            pil_image = Image.fromarray(masked_image_uint8)
            pil_image.save(f'{sessionId}/masked_with_point_{i}.png')


            mask_image = mask * color.reshape(1, 1, -1)
            mask_image_uint8 = (mask_image * 255).astype(np.uint8)
            pil_image = Image.fromarray(mask_image_uint8)
            pil_image.save(f'{sessionId}/mask_with_point_{i}.png')


            result_image = mask * color + (1 - mask) * interior_image
            result_image_uint8 = (result_image * 255).astype(np.uint8)
            pil_image = Image.fromarray(result_image_uint8)
            pil_image.save(f'{sessionId}/result_with_point_{i}.png')
        return masked_image_uint8