import sys
import re
from keyword_handler import KeywordHandler

# Global variables
kw_handler = KeywordHandler()
keyword_func_list = {
    "png"                   : kw_handler.png_handler,
    "position"              : kw_handler.position_handler,
    "color"                 : kw_handler.color_handler,
    "drawArraysTriangles"   : kw_handler.drawArraysTriangles_handler,
    "elements"              : kw_handler.elements_handler,
    "drawElementsTriangles" : kw_handler.drawElementsTriangles_handler,
    "depth"                 : kw_handler.depth_handler,
    "sRGB"                  : kw_handler.sRGB_handler,
    "hyp"                   : kw_handler.hyp_handler,
    "uniformMatrix"         : kw_handler.uniformMatrix_handler,
    "cull"                  : kw_handler.cull_handler,
    "fsaa"                  : kw_handler.fsaa_handler,
    "texture"               : kw_handler.texture_handler,
    "texcoord"              : kw_handler.texcoord_handler
}

# Functions
def parse(filename):
    """
        Parse the input file and execute commands line by line.
    """
    with open(filename) as file:
        for line in file:
            line = line.strip()
            line = re.sub(' +', ' ', line)
            words = line.split(' ')
            keyword = words[0]
            args = words[1:]
            if keyword in keyword_func_list:
                keyword_handler = keyword_func_list[keyword]
                keyword_handler(*args)

def main():
    input_file = sys.argv[1]
    parse(input_file)
    kw_handler.save_image()


if __name__ == "__main__":
    main()
