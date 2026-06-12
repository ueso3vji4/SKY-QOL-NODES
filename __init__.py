"""Sky Nodes - custom ComfyUI node pack.

Add a new node: create a module in nodes/ that defines node classes,
then register it in the imports + mappings below.
"""
from .nodes.multi_upload import LoadImagesMultiUpload
from .nodes.utils import AnyToString

NODE_CLASS_MAPPINGS = {
    "LoadImagesMultiUpload": LoadImagesMultiUpload,
    "AnyToString": AnyToString,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "LoadImagesMultiUpload": "Load Images (Multi-Upload)",
    "AnyToString": "Any to String (list-safe)",
}
WEB_DIRECTORY = "./web/js"
