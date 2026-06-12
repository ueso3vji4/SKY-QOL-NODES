# Sky Nodes

A small ComfyUI node pack focused on practical batch processing.

## Nodes

| Node | Description |
| --- | --- |
| **Load Images (Multi-Upload)** | Upload any number of images straight into the node (multi-select file picker or drag & drop onto the panel). Processes them through the workflow in sequential groups with a configurable group size, live progress, done/next markers on thumbnails, and a guarded Run batch button that can't double-queue. |
| **Any to String (list-safe)** | Converts any incoming value to a string, one item at a time. Useful in batched workflows where display/preview nodes collapse lists and break downstream string inputs. |
| **Mask Batch Union (merge all)** | Merges every mask in a batch into one mask via pixel-wise max. Useful after SAM3 text segmentation when multiple detections (face, hair, etc.) come out as separate masks and you want one combined region. Outputs the merged mask plus the original count. |

## Install

```
cd ComfyUI/custom_nodes
git clone https://github.com/ueso3vji4/ComfyUI-SkyNodes.git
```

Restart ComfyUI. No extra requirements - the pack only uses what ComfyUI already ships with.

## Using the Multi-Upload node

1. Add **Load Images (Multi-Upload)** (or load a workflow that includes it)
2. Click **Add...** and multi-select your images, or drag files onto the panel
3. Set **Group** - how many images run together per step (1 is safest for VRAM;
   set it to your image count to push everything through in a single run)
4. Press **Run batch** - it queues exactly the right number of runs and tracks progress
5. **Reset progress** restarts from image 1; **Clear** empties the list; hover any `?` for help

Wire its IMAGE/MASK outputs wherever a normal Load Image node would go. The whole
downstream workflow runs once per group automatically.

## Repository layout

```
ComfyUI-SkyNodes/
  __init__.py          registers all nodes
  nodes/               one file per node - add new nodes here
    multi_upload.py
    utils.py
  web/js/              frontend code for node panels
    multiupload.js
```

## Adding a new node

Create a module in `nodes/`, define the node class, then add one import line and
one mappings entry in `__init__.py`. Frontend code (if any) goes in `web/js/`.
