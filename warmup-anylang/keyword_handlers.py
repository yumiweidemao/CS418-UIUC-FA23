from PIL import Image

img             = None
buf             = None
colors          = None
output_filename = None

def png_handler(*args):
    width, height, filename = int(args[0]), int(args[1]), args[2]
    output_filename = filename
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

def position_handler(*args):
    buf = args

def color_handler(*args):
    colors = args

def drawPixels_handler(*args):
    n = int(args[0])
    
