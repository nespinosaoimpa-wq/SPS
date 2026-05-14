import os
import re

def check_imports(directory, icons):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for icon in icons:
                        # Check if <Icon is used (with space or newline after)
                        if f'<{icon}' in content:
                            # Check if icon is imported from lucide-react
                            # This regex is a bit loose to account for multiline imports
                            import_pattern = rf'import\s*\{{[^}}]*{icon}[^}}]*\}}\s*from\s*[\'"]lucide-react[\'"]'
                            if not re.search(import_pattern, content, re.DOTALL):
                                print(f"MISSING IMPORT: {icon} in {path}")

check_imports('src', ['Package', 'Zap', 'Shield', 'ShieldCheck', 'Users'])
