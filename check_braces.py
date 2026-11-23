import sys

with open('script_0.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
in_string = False
string_char = None
escape = False
in_line_comment = False
in_block_comment = False

for line_num, line in enumerate(lines, 1):
    i = 0
    while i < len(line):
        ch = line[i]

        # Handle escape
        if escape:
            escape = False
            i += 1
            continue

        # Handle block comment
        if in_block_comment:
            if ch == '*' and i + 1 < len(line) and line[i+1] == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        # Handle line comment
        if in_line_comment:
            if ch == '\n':
                in_line_comment = False
            i += 1
            continue

        # Handle string
        if in_string:
            if ch == '\\':
                escape = True
                i += 1
                continue
            if ch == string_char:
                in_string = False
            i += 1
            continue

        # Check for comment start
        if ch == '/' and i + 1 < len(line):
            if line[i+1] == '/':
                in_line_comment = True
                i += 2
                continue
            elif line[i+1] == '*':
                in_block_comment = True
                i += 2
                continue

        # Check for string start
        if ch in ('"', "'", '`'):
            in_string = True
            string_char = ch
            i += 1
            continue

        # Count braces
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth < 0:
                print(f"ERROR: Negative depth at line {line_num}, col {i}")
                print(f"  {line.rstrip()[:100]}")

        i += 1

    # Print depth at certain lines
    if line_num % 500 == 0:
        print(f"Line {line_num}: depth = {depth}")

print(f"\nFinal depth: {depth}")
print(f"Total lines: {len(lines)}")

# Find where depth is 6 and stays there
if depth == 6:
    print("\nSearching for unclosed braces...")
    depth = 0
    in_string = False
    string_char = None
    escape = False
    in_line_comment = False
    in_block_comment = False

    for line_num, line in enumerate(lines, 1):
        old_depth = depth
        i = 0
        while i < len(line):
            ch = line[i]

            if escape:
                escape = False
                i += 1
                continue

            if in_block_comment:
                if ch == '*' and i + 1 < len(line) and line[i+1] == '/':
                    in_block_comment = False
                    i += 2
                    continue
                i += 1
                continue

            if in_line_comment:
                if ch == '\n':
                    in_line_comment = False
                i += 1
                continue

            if in_string:
                if ch == '\\':
                    escape = True
                    i += 1
                    continue
                if ch == string_char:
                    in_string = False
                i += 1
                continue

            if ch == '/' and i + 1 < len(line):
                if line[i+1] == '/':
                    in_line_comment = True
                    i += 2
                    continue
                elif line[i+1] == '*':
                    in_block_comment = True
                    i += 2
                    continue

            if ch in ('"', "'", '`'):
                in_string = True
                string_char = ch
                i += 1
                continue

            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1

            i += 1

        # Print lines where depth increases and doesn't decrease back
        if depth > old_depth and line_num > 4000:
            print(f"Line {line_num}: depth {old_depth} -> {depth}")
            print(f"  {line.rstrip()[:100]}")
