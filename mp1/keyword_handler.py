from PIL import Image
import numpy as np

class KeywordHandler:
    def __init__(self):
        self.__img              = None
        self.__width            = None
        self.__height           = None
        self.__buf              = None
        self.__colors           = None
        self.__output_filename  = None
        self.__color_dim        = None
        self.__pos_dim          = None
        self.__elements         = None
        self.__depth_buf        = None
        self.__uniform_matrix   = None
        self.__fsaa_level       = None
        self.__fsaa_buf         = None
        self.__texcoord_buf     = None
        self.__tex_img          = None

        # mode switches
        self.__depth_enabled    = False
        self.__hyp_enabled      = False
        self.__alpha_enabled    = False
        self.__cull_enabled     = False
        self.__texture_enabled  = False

        # use linear gamma by default
        self.__gamma            = self.__linear_gamma

    ### Below are core functions ###

    def png_handler(self, *args):
        width, height, filename = int(args[0]), int(args[1]), args[2]
        self.__width = width
        self.__height = height
        self.__output_filename = filename
        self.__img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    def position_handler(self, *args):
        self.__pos_dim = int(args[0])
        self.__buf = []
        for i in range(int(len(args[1:]) / self.__pos_dim)):
            curr_point = []
            for j in range(self.__pos_dim):
                curr_point.append(float(args[1+i*self.__pos_dim+j]))
            if self.__pos_dim == 2:
                curr_point.extend([0, 1])
            elif self.__pos_dim == 3:
                curr_point.append(1)
            self.__buf.append(curr_point)

    def color_handler(self, *args):
        self.__color_dim = int(args[0])
        if self.__color_dim == 4:
            self.__alpha_enabled = True
        self.__colors = []
        for i in range(int(len(args[1:]) / self.__color_dim)):
            curr_color = []
            for j in range(self.__color_dim):
                curr_color.append(float(args[1+i*self.__color_dim+j]))
            if self.__color_dim == 3:
                curr_color.append(1)
            self.__colors.append(curr_color)

    def drawArraysTriangles_handler(self, *args):
        first = int(args[0])
        count = int(args[1])
        points = []
        for i in range(count//3):
            p1, p2, p3 = self.__generate_points(first+i*3, first+i*3+1, first+i*3+2)
            if self.__cull_enabled and self.__is_clockwise(p1, p2, p3):
                continue
            temp = self.__scanline(p1, p2, p3)
            if temp is not None:
                points.extend(temp)
        self.__draw_points(points)

    def save_image(self):
        self.__img.save(self.__output_filename)

    ### Below are elective functions ###
    
    def elements_handler(self, *args):
        self.__elements = [int(arg) for arg in args]

    def drawElementsTriangles_handler(self, *args):
        count = int(args[0])
        offset = int(args[1])
        points = []
        for i in range(count//3):
            p1, p2, p3 = self.__generate_points(self.__elements[offset+i*3],
                                                self.__elements[offset+i*3+1],
                                                self.__elements[offset+i*3+2])
            if self.__cull_enabled and self.__is_clockwise(p1, p2, p3):
                continue
            temp = self.__scanline(p1, p2, p3)
            if temp is not None:
                points.extend(temp)
        self.__draw_points(points)

    def depth_handler(self, *args):
        self.__depth_enabled = True
        if self.__depth_buf is None:
            self.__depth_buf = [[float('inf') for _ in range(self.__width)]\
                                 for _ in range(self.__height)]

    def sRGB_handler(self, *args):
        self.__gamma = self.__sRGB_gamma

    def hyp_handler(self, *args):
        self.__hyp_enabled = True

    def uniformMatrix_handler(self, *args):
        self.__uniform_matrix = np.array([
            [float(args[0]), float(args[4]), float(args[8]), float(args[12])],
            [float(args[1]), float(args[5]), float(args[9]), float(args[13])],
            [float(args[2]), float(args[6]), float(args[10]), float(args[14])],
            [float(args[3]), float(args[7]), float(args[11]), float(args[15])]
        ])
    
    def cull_handler(self, *args):
        self.__cull_enabled = True

    def fsaa_handler(self, *args):
        self.__fsaa_level = int(args[0])
        self.__fsaa_buf = [[np.array([0,0,0,0]) for _ in range(self.__fsaa_level*self.__width)]\
                            for _ in range(self.__fsaa_level*self.__height)]
        self.__depth_buf = [[float('inf') for _ in range(self.__fsaa_level*self.__width)]\
                             for _ in range(self.__fsaa_level*self.__height)]
        
    def texture_handler(self, *args):
        tex_filename = args[0]
        self.__texture_enabled = True
        self.__texcoord_buf = []
        self.__tex_img = Image.open(tex_filename)

    def texcoord_handler(self, *args):
        for i in range((len(args)-1)//2):
            coord = (float(args[1+i*2]), float(args[1+i*2+1]))
            self.__texcoord_buf.append(coord)

    ### Below are private helper functions ###

    def __generate_points(self, *indices):
        """
            Generate points (numpy arrays) from given indices.
            Note that the first two attributes must be x & y for __scanline() to work.
            Changes made in this function should also be reflected in __draw_points().
        """
        points = []
        fsaa_level = 1 if self.__fsaa_level is None else self.__fsaa_level
        for idx in indices:
            pos = self.__buf[idx]
            if self.__uniform_matrix is not None:
                pos = np.matmul(self.__uniform_matrix, np.array(pos))
            color = self.__colors[idx] if self.__colors else (0, 0, 0, 0)
            s, t = self.__texcoord_buf[idx] if self.__texture_enabled else (0, 0)
            # current point format: (x', y', z, w, r, g, b, a, s, t)
            if not self.__hyp_enabled:
                point = np.array([
                    (pos[0]/pos[3] + 1)*self.__width*fsaa_level/2,
                    (pos[1]/pos[3] + 1)*self.__height*fsaa_level/2,
                    pos[2],
                    1,
                    color[0],
                    color[1],
                    color[2],
                    color[3],
                    s,
                    t
                ])
            else:
                point = np.array([
                    (pos[0]/pos[3] + 1)*self.__width*fsaa_level/2,
                    (pos[1]/pos[3] + 1)*self.__height*fsaa_level/2,
                    pos[2]/pos[3],
                    1/pos[3],
                    color[0]/pos[3],
                    color[1]/pos[3],
                    color[2]/pos[3],
                    color[3]/pos[3],
                    s/pos[3],
                    t/pos[3]
                ])
            points.append(point)
        return points
    
    def __draw_points(self, points):
        fsaa_level = 1 if self.__fsaa_level is None else self.__fsaa_level
        for point in points:
            x, y = int(point[0]), int(point[1])
            r, g, b, a = int(self.__gamma(point[4]/point[3])*255),\
                         int(self.__gamma(point[5]/point[3])*255),\
                         int(self.__gamma(point[6]/point[3])*255),\
                         int(point[7]/point[3]*255)
            if self.__alpha_enabled:
                r_old, g_old, b_old, a_old = self.__img.getpixel((x, y))
                a_prime = a + a_old*(1-a/255)
                r = int(a/a_prime * r + (1-a/255)*a_old/a_prime * r_old)
                g = int(a/a_prime * g + (1-a/255)*a_old/a_prime * g_old)
                b = int(a/a_prime * b + (1-a/255)*a_old/a_prime * b_old)
                a = int(a_prime)
            if self.__texture_enabled:
                s = int((point[8]/point[3])%1.0*self.__tex_img.width)
                t = int((point[9]/point[3])%1.0*self.__tex_img.height)
                texel = self.__tex_img.getpixel((s, t))
                if len(texel) == 3:
                    r, g, b = texel
                    a = 255
                else:
                    r, g, b, a = texel
            if x < self.__width*fsaa_level and y < self.__height*fsaa_level:
                if self.__depth_enabled:
                    if point[2] < self.__depth_buf[y][x]:
                        self.__depth_buf[y][x] = point[2]
                        if self.__fsaa_level is None:
                            self.__img.putpixel((x, y), (r, g, b, a))
                        else:
                            self.__fsaa_buf[y][x] = np.array((r, g, b, a))
                else:
                    if self.__fsaa_level is None:
                        self.__img.putpixel((x, y), (r, g, b, a))
                    else:
                        self.__fsaa_buf[y][x] = np.array((r, g, b, a))
        
        if self.__fsaa_level is not None:
            for y in range(self.__height):
                for x in range(self.__width):
                    rgba = np.zeros(4)
                    for i in range(self.__fsaa_level):
                        for j in range(self.__fsaa_level):
                            rgba += self.__fsaa_buf[y*self.__fsaa_level+i][x*self.__fsaa_level+j]
                    rgba /= self.__fsaa_level**2
                    r, g, b, a = int(rgba[0]), int(rgba[1]), int(rgba[2]), int(rgba[3])
                    self.__img.putpixel((x, y), (r, g, b, a))

    def __scanline(self, pp, q, r):
        """
            @params pp, q, r: numpy vectors representing 3 points
            @retval a list of all points within the triangle
        """
        ans = []
        t, m, b = sorted([pp, q, r], key=lambda a:a[1])
        temp = self.__DDA_first_half(t, b, d=1)
        if temp is None:
            return None
        p_prime, s_prime = temp

        # top half
        temp = self.__DDA_first_half(t, m, d=1)
        if temp is not None:
            p, s = temp
            while p[1] < m[1]:
                temp = self.__DDA(p, p_prime, d=0)
                if temp is not None:
                    ans.extend(temp)
                p += s
                p_prime += s_prime
        
        # bottom half
        temp = self.__DDA_first_half(m, b, d=1)
        if temp is not None:
            p, s = temp
            while p[1] < b[1]:
                ans.extend(self.__DDA(p, p_prime, d=0))
                p += s
                p_prime += s_prime

        return ans        

    def __DDA_first_half(self, a, b, d):
        """
            @params a, b: numpy vectors
                    d: dimension for DDA
            @retval p: starting point
                    s: step vector
        """
        if a[d] == b[d]:
            return None
        if a[d] > b[d]:
            a, b = b, a
        delta = b - a
        s = delta / delta[d]
        e = np.ceil(a[d]) - a[d]
        o = e*s
        p = a+o
        return p, s
    
    def __DDA(self, a, b, d):
        """
            @params a, b: numpy vectors
                    d: dimension for DDA
            @retval a list of points p between a, b where p[d] is an integer
        """
        temp = self.__DDA_first_half(a, b, d)
        if temp is None:
            return None
        if a[d] > b[d]:
            a, b = b, a
        p, s = temp
        ret = []
        while p[d] < b[d]:
            ret.append(np.copy(p))
            p += s
        return ret
    
    def __is_clockwise(self, p1, p2, p3):
        # Given three points p where (p[0], p[1]) = (x, y),
        # return true if p1->p2->p3->p1 is clockwise.
        p1 = np.array([p1[0], p1[1]])
        p2 = np.array([p2[0], p2[1]])
        p3 = np.array([p3[0], p3[1]])

        # use cross-product to find path direction
        v1 = p2 - p1
        v2 = p3 - p2
        z = v1[0] * v2[1] - v1[1] * v2[0]
        if z > 0:
            return True
        return False
    
    def __linear_gamma(self, l_display):
        return l_display
    
    def __sRGB_gamma(self, l_display):
        if l_display <= 0.0031308:
            return l_display*12.92
        else:
            return 1.055*(l_display)**(1/2.4) - 0.055
