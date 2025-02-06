import torch
import torch.nn as nn
import torch.onnx
from RealESRGAN.model import RRDBNet
import os

def convert_to_onnx():
    # Create model
    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32)
    
    # Load weights
    state_dict = torch.load('weights/RealESRGAN_x4.pth', map_location='cpu')
    model.load_state_dict(state_dict)
    model.eval()
    
    # Create example input
    example = torch.randn(1, 3, 64, 64)
    
    # Export to ONNX
    torch.onnx.export(
        model,
        example,
        'model.onnx',
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {2: 'height', 3: 'width'},
            'output': {2: 'height', 3: 'width'}
        }
    )

if __name__ == '__main__':
    convert_to_onnx()
    
    # Convert ONNX to TensorFlow.js
    os.system('tensorflowjs_converter \
        --input_format=tf_saved_model \
        --output_format=tfjs_graph_model \
        --signature_name=serving_default \
        --saved_model_tags=serve \
        model.onnx \
        ../public/models/real-esrgan') 