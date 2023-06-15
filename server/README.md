# Flask AppServer

This document serves as a guide to run our Flask-based AppServer.

## Pre-installation Steps

Before running this server, you will need to download a specific model checkpoint. 

1. Navigate to the [Facebook Research Segment Anything page](https://github.com/facebookresearch/segment-anything#model-checkpoints).

OR

2. Click on the hyperlink [ViT-H SAM model](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth) to directly download the checkpoint.

After downloading the `vit_h` checkpoint, place it within the `server` folder in your local directory.

Then, install the necessary Python packages. Navigate to the directory containing the requirements.txt file and run the following command in your terminal:

```bash
pip install -r requirements.txt
```
This will install all the dependencies your project needs to run.

## Execution Instructions

To run the server, use the following command:

```bash
python app.py
```