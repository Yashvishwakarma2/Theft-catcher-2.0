import os

templates_dir = "templates"
for filename in os.listdir(templates_dir):
    if not filename.endswith(".html"):
        continue
    filepath = os.path.join(templates_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # CSS
    content = content.replace('href="styles.css"', 'href="{{ url_for(\'static\', filename=\'styles.css\') }}"')
    
    # JS
    content = content.replace('src="modals.js"', 'src="{{ url_for(\'static\', filename=\'modals.js\') }}"')
    content = content.replace('src="db.js"', 'src="{{ url_for(\'static\', filename=\'db.js\') }}"')
    content = content.replace('src="script.js"', 'src="{{ url_for(\'static\', filename=\'script.js\') }}"')
    content = content.replace('src="login.js"', 'src="{{ url_for(\'static\', filename=\'login.js\') }}"')
    
    # Nav links
    content = content.replace('href="index.html"', 'href="{{ url_for(\'index\') }}"')
    content = content.replace('href="object.html"', 'href="{{ url_for(\'object_detect\') }}"')
    content = content.replace('href="weapon.html"', 'href="{{ url_for(\'weapon_detect\') }}"')
    content = content.replace('href="login.html"', 'href="{{ url_for(\'login\') }}"')
    content = content.replace("window.location.href = 'index.html'", "window.location.href = '{{ url_for(\'index\') }}'")
    content = content.replace("window.location.href = 'login.html'", "window.location.href = '{{ url_for(\'login\') }}'")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
print("Updated HTML files for Jinja.")
