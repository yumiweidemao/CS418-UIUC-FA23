import sys
from keyword_handlers import *

# Global variables
keyword_func_list = {
    "png"       : png_handler,
    "position"  : position_handler,
    "color"     : color_handler,
    "drawPixels": drawPixels_handler
}


# Functions
def parse(filename):
    """
        Parse the input file and execute commands line by line.
    """
    with open(filename) as file:
        for line in file:
            line = line.strip()
            words = line.split(' ')
            keyword = words[0]
            args = words[1:]
            if keyword in keyword_func_list:
                keyword_handler = keyword_func_list[keyword]
                keyword_handler(args)

def main():
    input_file = sys.argv[1]
    parse(input_file)
    img.save(output_filename)


if __name__ == "__main__":
    main()
