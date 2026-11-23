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
    start_depth = depth
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

    # Print lines where depth changes significantly
    if depth != start_depth:
        if abs(depth - start_depth) >= 2 or depth == 0 or start_depth == 0:
            print(f"Line {line_num}: {start_depth} -> {depth}  |  {line.rstrip()[:80]}")

print(f"\nFinal depth: {depth}")
