const fs = require('fs');
const path = require('path');

const srcPattern = "C:\\Users\\91873\\.gemini\\antigravity\\brain\\66082ae2-0274-46f9-b9cf-f2efe9a3d125";
const destFolder = "c:\\Users\\91873\\Portfolio Website\\public";

if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder, { recursive: true });
}

// 1. Copy Image
const files = fs.readdirSync(srcPattern).filter(f => f.endsWith('.png') && f.startsWith('kaze_portfolio_mockup_'));
if (files.length > 0) {
    // Get the most recent file
    files.sort((a, b) => {
        return fs.statSync(path.join(srcPattern, b)).mtime.getTime() - fs.statSync(path.join(srcPattern, a)).mtime.getTime();
    });
    const latestFile = files[0];
    fs.copyFileSync(path.join(srcPattern, latestFile), path.join(destFolder, "kaze-preview.png"));
    console.log("Copied latest image: " + latestFile);
}

// 2. Update components.js
const componentsPath = "c:\\Users\\91873\\Portfolio Website\\src\\components.js";
let componentsCode = fs.readFileSync(componentsPath, 'utf8');

const replacement = `  const imageStyle = project.image 
    ? \\\`background-image: url('\${project.image}'); background-size: cover; background-position: center;\\\`
    : \\\`background: \${project.gradient}\\\`;

  card.innerHTML = \\\`
    <div class="card-glow" style="background: \${project.gradient}"></div>
    <div class="card-content">
        <div class="card-image-wrapper" style="\${imageStyle}">`;

if (!componentsCode.includes("const imageStyle =")) {
    componentsCode = componentsCode.replace(`  card.innerHTML = \`
    <div class="card-glow" style="background: \${project.gradient}"></div>
    <div class="card-content">
        <div class="card-image-wrapper" style="background: \${project.gradient}">`, replacement.replace(/\\`/g, '`'));
    fs.writeFileSync(componentsPath, componentsCode, 'utf8');
    console.log("Updated components.js");
}

// 3. Update data.js
const dataPath = "c:\\Users\\91873\\Portfolio Website\\src\\data.js";
let dataCode = fs.readFileSync(dataPath, 'utf8');

const dataReplacement = `        {
            id: 5,
            title: "Kaze Restaurant",
            description: "A premium, modern restaurant website featuring dark luxury aesthetics, a glassmorphism UI, a multi-layer parallax hero section, and smooth micro-animations.",
            tags: ["HTML5", "CSS3", "JavaScript", "UI/UX"],
            gradient: "linear-gradient(135deg, #166534, #052e16)",
            image: "/kaze-preview.png",
            link: "https://github.com/AbhishekrAwashthi/kaze-restaurant"
        },`;

if (!dataCode.includes("image: \"/kaze-preview.png\"")) {
    dataCode = dataCode.replace(`        {
            id: 5,
            title: "Kaze Restaurant",
            description: "A premium, modern restaurant website featuring dark luxury aesthetics, a glassmorphism UI, a multi-layer parallax hero section, and smooth micro-animations.",
            tags: ["HTML5", "CSS3", "JavaScript", "UI/UX"],
            gradient: "linear-gradient(135deg, #166534, #052e16)",
            link: "#"
        },`, dataReplacement);
    fs.writeFileSync(dataPath, dataCode, 'utf8');
    console.log("Updated data.js");
}

console.log("Done updating portfolio!");
