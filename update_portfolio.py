import os
import shutil
import glob

# 1. Copy the image
source_pattern = r"C:\Users\91873\.gemini\antigravity\brain\66082ae2-0274-46f9-b9cf-f2efe9a3d125\*.png"
dest_folder = r"c:\Users\91873\Portfolio Website\public"
os.makedirs(dest_folder, exist_ok=True)

files = glob.glob(source_pattern)
if files:
    # Get the latest one
    latest_file = max(files, key=os.path.getctime)
    shutil.copy2(latest_file, os.path.join(dest_folder, "kaze-preview.png"))

# 2. Update components.js
components_path = r"c:\Users\91873\Portfolio Website\src\components.js"
with open(components_path, "r", encoding="utf-8") as f:
    components_code = f.read()

replacement = """  const imageStyle = project.image 
    ? `background-image: url('${project.image}'); background-size: cover; background-position: center;`
    : `background: ${project.gradient}`;

  card.innerHTML = `
    <div class="card-glow" style="background: ${project.gradient}"></div>
    <div class="card-content">
        <div class="card-image-wrapper" style="${imageStyle}">"""

if "const imageStyle =" not in components_code:
    components_code = components_code.replace("""  card.innerHTML = `
    <div class="card-glow" style="background: ${project.gradient}"></div>
    <div class="card-content">
        <div class="card-image-wrapper" style="background: ${project.gradient}">""", replacement)

with open(components_path, "w", encoding="utf-8") as f:
    f.write(components_code)

# 3. Update data.js
data_path = r"c:\Users\91873\Portfolio Website\src\data.js"
with open(data_path, "r", encoding="utf-8") as f:
    data_code = f.read()

data_replacement = """        {
            id: 5,
            title: "Kaze Restaurant",
            description: "A premium, modern restaurant website featuring dark luxury aesthetics, a glassmorphism UI, a multi-layer parallax hero section, and smooth micro-animations.",
            tags: ["HTML5", "CSS3", "JavaScript", "UI/UX"],
            gradient: "linear-gradient(135deg, #166534, #052e16)",
            image: "/kaze-preview.png",
            link: "https://github.com/AbhishekrAwashthi/kaze-restaurant"
        },"""

if "image: \"/kaze-preview.png\"" not in data_code:
    data_code = data_code.replace("""        {
            id: 5,
            title: "Kaze Restaurant",
            description: "A premium, modern restaurant website featuring dark luxury aesthetics, a glassmorphism UI, a multi-layer parallax hero section, and smooth micro-animations.",
            tags: ["HTML5", "CSS3", "JavaScript", "UI/UX"],
            gradient: "linear-gradient(135deg, #166534, #052e16)",
            link: "#"
        },""", data_replacement)

with open(data_path, "w", encoding="utf-8") as f:
    f.write(data_code)

print("Done updating portfolio!")
