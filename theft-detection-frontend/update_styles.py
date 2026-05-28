import os

file_path = "styles.css"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace colors
content = content.replace("0, 242, 254", "0, 255, 102")
content = content.replace("#00f2fe", "#00ff66")
content = content.replace("#4facfe", "#00cc52")

# Smooth drift animation
content = content.replace("animation: drift 15s ease-in-out infinite alternate;", "animation: drift 20s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;")

content = content.replace(
    "@keyframes drift {\n    0% { transform: translate(0, 0); }\n    100% { transform: translate(50px, 30px); }\n}",
    "@keyframes drift {\n    0% { transform: translate(0, 0) scale(1); }\n    50% { transform: translate(25px, 15px) scale(1.05); }\n    100% { transform: translate(50px, 30px) scale(1); }\n}"
)

# Panel hover & transition
content = content.replace(
    "transition: transform 0.3s ease, border-color 0.3s ease;",
    "transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);"
)

content = content.replace(
    ".stat-card:hover, .detection-panel:hover, .results-panel:hover, .controls-panel:hover {\n    border-color: rgba(255, 255, 255, 0.15);\n}",
    ".stat-card:hover, .detection-panel:hover, .results-panel:hover, .controls-panel:hover {\n    border-color: rgba(0, 255, 102, 0.3);\n    transform: translateY(-5px);\n    box-shadow: 0 15px 35px -10px rgba(0, 255, 102, 0.15);\n}"
)

# Nav-item transition
content = content.replace(
    "transition: all 0.3s ease;",
    "transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);"
)

# Btn transition
content = content.replace(
    "transition: all 0.2s ease;",
    "transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated styles.css")
