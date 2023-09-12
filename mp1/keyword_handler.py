from PIL import Image

class KeywordHandler:
    def __init__(self):
        self.__img              = None
        self.__buf              = None
        self.__colors           = None
        self.__output_filename  = None
        self.__color_dim        = None
        self.__pos_dim          = None

    def png_handler(self, *args):
        width, height, filename = int(args[0]), int(args[1]), args[2]
        self.__output_filename = filename
        self.__img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    def position_handler(self, *args):
        self.__pos_dim = int(args[0])
        self.__buf = [int(arg) for arg in args[1:]]

    def color_handler(self, *args):
        self.__color_dim = int(args[0])
        self.__colors = [int(arg) for arg in args[1:]]

    def drawArraysTriangles_handler(self, *args):
        pass

    def save_image(self):
        self.__img.save(self.__output_filename)
