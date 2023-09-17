.PHONY: build, run

TEST_DIR = test_files
TEST_FILES = rast-2d3d.txt rast-alpha.txt rast-checkers.txt rast-cull.txt rast-decals.txt rast-depth.txt
TEST_FILES += rast-elements.txt rast-fsaa2.txt rast-fsaa8.txt rast-gammabox.txt rast-gray.txt rast-matrix.txt
TEST_FILES += rast-perspective.txt rast-smallgap.txt rast-smoothcolor.txt rast-sRGB.txt rast-textures.txt

build:

run:
	python txt2png.py $(file)

test:
	for file in $(TEST_FILES); do \
		python txt2png.py $(TEST_DIR)/$$file; \
	done
