from __future__ import annotations

import json
import random
import re
from collections import deque
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.patches as patches
    import matplotlib.pyplot as plt

    HAS_MATPLOTLIB = True
except Exception:
    HAS_MATPLOTLIB = False


Grid = List[List[str]]
Point = Tuple[int, int]


TRANSLATIONS = {
    "en": {
        "pipeline_title": "Maze Generation Pipeline",
        "step1": "Step 1: Maze Map Generation",
        "step2": "Step 2: Text Visualization",
        "step3": "Step 3: Sort by Turn Count",
        "step4": "Step 4: Image Visualization",
        "maps_missing": "maps folder not found",
        "view_missing": "view folder not found",
        "sort_missing": "sortview folder not found",
        "done": "All tasks complete",
        "skip_missing_file": "file not found. Skipping.",
        "skip_empty": "No generated maps. Skipping.",
        "matplotlib_missing": "matplotlib not installed. Skipping image generation.",
    },
    "ko": {
        "pipeline_title": "미로 생성 파이프라인",
        "step1": "1단계: 미로 맵 생성",
        "step2": "2단계: 텍스트 시각화",
        "step3": "3단계: 회전 수 정렬",
        "step4": "4단계: 이미지 시각화",
        "maps_missing": "maps 폴더를 찾을 수 없습니다",
        "view_missing": "view 폴더를 찾을 수 없습니다",
        "sort_missing": "sortview 폴더를 찾을 수 없습니다",
        "done": "모든 작업 완료",
        "skip_missing_file": "파일이 없어 건너뜁니다.",
        "skip_empty": "생성된 맵이 없어 건너뜁니다.",
        "matplotlib_missing": "matplotlib이 없어 이미지 생성을 건너뜁니다.",
    },
}


def _t(language: str, key: str) -> str:
    lang = "ko" if language.lower().startswith("ko") else "en"
    return TRANSLATIONS[lang][key]


def create_grid(size: int) -> Grid:
    grid = [["." for _ in range(size)] for _ in range(size)]
    for row in range(size):
        for col in range(size):
            if row % 2 == 1 and col % 2 == 1:
                grid[row][col] = "#"
    return grid


def bfs_one_path(grid: Grid, start: Point, goal: Point) -> Optional[List[Point]]:
    size = len(grid)
    queue: deque[Point] = deque([start])
    parent: dict[Point, Point | None] = {start: None}

    while queue:
        current = queue.popleft()
        if current == goal:
            path: List[Point] = []
            node: Point | None = goal
            while node is not None:
                path.append(node)
                node = parent[node]
            return path[::-1]

        row, col = current
        for d_row, d_col in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            next_pos = (row + d_row, col + d_col)
            next_row, next_col = next_pos

            if not (0 <= next_row < size and 0 <= next_col < size):
                continue
            if next_pos in parent:
                continue
            if grid[next_row][next_col] == "#":
                continue

            parent[next_pos] = current
            queue.append(next_pos)

    return None


def find_two_paths_bfs(grid: Grid, start: Point, goal: Point) -> List[List[Point]]:
    first_path = bfs_one_path(grid, start, goal)
    if not first_path:
        return []

    paths: List[List[Point]] = [first_path]

    for index in range(1, len(first_path) - 1):
        block_pos = first_path[index]
        row, col = block_pos

        if grid[row][col] not in {".", "R"}:
            continue

        original_value = grid[row][col]
        grid[row][col] = "#"
        second_path = bfs_one_path(grid, start, goal)
        grid[row][col] = original_value

        if second_path:
            paths.append(second_path)
            break

    return paths


def _collect_cycle_candidates(
    path: List[Point],
    unique_points: set[Point],
    common_points: set[Point],
    start: Point,
    goal: Point,
    grid: Grid,
) -> List[Point]:
    index_by_point = {point: idx for idx, point in enumerate(path)}
    cycle_candidates: List[Point] = []

    for point in unique_points:
        row, col = point
        if point in {start, goal}:
            continue
        if grid[row][col] != ".":
            continue

        idx = index_by_point[point]
        has_common_before = any(path[i] in common_points for i in range(0, idx))
        has_common_after = any(path[i] in common_points for i in range(idx + 1, len(path)))

        if has_common_before and has_common_after:
            cycle_candidates.append(point)

    return cycle_candidates


def create_maze_map(size: int, max_iterations: int = 500) -> Optional[Dict]:
    grid = create_grid(size)
    start = (0, 0)
    goal = (size - 1, size - 1)
    grid[start[0]][start[1]] = "S"
    grid[goal[0]][goal[1]] = "G"

    blocked_positions: List[Point] = []

    for iteration in range(1, max_iterations + 1):
        paths = find_two_paths_bfs(grid, start, goal)
        path_count = len(paths)

        if path_count == 0:
            if blocked_positions:
                last_row, last_col = blocked_positions.pop()
                grid[last_row][last_col] = "."
            continue

        if path_count == 1:
            break

        path1 = paths[0]
        path2 = paths[1]

        path1_set = set(path1)
        path2_set = set(path2)

        common_points = path1_set & path2_set
        path1_unique = path1_set - path2_set
        path2_unique = path2_set - path1_set

        cycle_candidates = _collect_cycle_candidates(
            path=path1,
            unique_points=path1_unique,
            common_points=common_points,
            start=start,
            goal=goal,
            grid=grid,
        )
        for candidate in _collect_cycle_candidates(
            path=path2,
            unique_points=path2_unique,
            common_points=common_points,
            start=start,
            goal=goal,
            grid=grid,
        ):
            if candidate not in cycle_candidates:
                cycle_candidates.append(candidate)

        if cycle_candidates:
            block_row, block_col = random.choice(cycle_candidates)
        else:
            candidates = [
                point
                for point in (path1_unique | path2_unique)
                if point not in {start, goal} and grid[point[0]][point[1]] == "."
            ]
            if not candidates:
                return None
            block_row, block_col = random.choice(candidates)

        grid[block_row][block_col] = "#"
        blocked_positions.append((block_row, block_col))
    else:
        return None

    final_paths = find_two_paths_bfs(grid, start, goal)
    if not final_paths:
        return None

    final_path = final_paths[0]
    for row, col in final_path:
        if (row, col) not in {start, goal}:
            grid[row][col] = "R"

    map_str = "\n".join("".join(row) for row in grid)

    return {
        "size": size,
        "start": list(start),
        "goal": list(goal),
        "map": map_str,
        "stats": {
            "num_walls": sum(row.count("#") for row in grid),
            "num_route": sum(row.count("R") for row in grid),
            "path_length": len(final_path),
        },
    }


def generate_maze_maps(
    base_dir: Path,
    language: str,
    min_size: int = 5,
    max_size: int = 20,
    attempts_per_size: int = 100,
    max_iterations: int = 500,
) -> None:
    maps_dir = base_dir / "maps"
    maps_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print(_t(language, "step1"))
    print("=" * 70)

    for size in range(min_size, max_size + 1):
        print(f"Processing {size}x{size}...")
        generated: List[Dict] = []

        for attempt in range(attempts_per_size):
            maze_data = create_maze_map(size=size, max_iterations=max_iterations)
            if maze_data:
                maze_data["map_id"] = len(generated)
                generated.append(maze_data)

            if (attempt + 1) % 10 == 0:
                print(
                    f"  progress: {attempt + 1}/{attempts_per_size} | generated: {len(generated)}"
                )

        output_path = maps_dir / f"{size}.json"
        output_path.write_text(
            json.dumps(generated, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        success_rate = (len(generated) / attempts_per_size) * 100 if attempts_per_size else 0.0
        print(f"  saved: {output_path} ({len(generated)} maps, success {success_rate:.1f}%)")


def visualize_maps_to_txt(
    base_dir: Path,
    language: str,
    min_size: int = 5,
    max_size: int = 20,
) -> None:
    maps_dir = base_dir / "maps"
    view_dir = base_dir / "view"

    if not maps_dir.exists():
        print(f"Error: {maps_dir} ({_t(language, 'maps_missing')})")
        return

    view_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print(_t(language, "step2"))
    print("=" * 70)

    for size in range(min_size, max_size + 1):
        input_path = maps_dir / f"{size}.json"
        if not input_path.exists():
            print(f"  {input_path}: {_t(language, 'skip_missing_file')}")
            continue

        maps = json.loads(input_path.read_text(encoding="utf-8"))
        if not maps:
            print(f"  {size}x{size}: {_t(language, 'skip_empty')}")
            continue

        output_path = view_dir / f"{size}.txt"
        with output_path.open("w", encoding="utf-8") as output_file:
            for index, map_data in enumerate(maps, start=1):
                output_file.write("=" * 60 + "\n")
                output_file.write(f"Size: {size}x{size} | Map #: {index}/{len(maps)}\n")
                output_file.write(
                    f"Start: {map_data.get('start')} | Goal: {map_data.get('goal')}\n"
                )
                output_file.write(f"Stats: {map_data.get('stats')}\n")
                output_file.write("=" * 60 + "\n")
                output_file.write(map_data["map"] + "\n\n\n")

        print(f"  saved: {output_path}")


def parse_maze_view(file_path: Path) -> List[Dict]:
    content = file_path.read_text(encoding="utf-8")
    sections = content.split("=" * 60)
    parsed: List[Dict] = []

    for index in range(1, len(sections), 2):
        if index + 1 >= len(sections):
            break

        header = sections[index].strip()
        grid = sections[index + 1].strip()

        if not grid:
            continue

        map_match = re.search(r"Map #: (\d+)/(\d+)", header)
        if not map_match:
            continue

        parsed.append(
            {
                "map_num": int(map_match.group(1)),
                "header": header,
                "grid": grid,
            }
        )

    return parsed


def find_path_coordinates(grid_text: str) -> List[Point]:
    lines = grid_text.split("\n")

    start: Point | None = None
    goal: Point | None = None
    walkable: Dict[Point, str] = {}

    for row, line in enumerate(lines):
        for col, char in enumerate(line):
            if char == "S":
                start = (row, col)
                walkable[(row, col)] = "S"
            elif char == "G":
                goal = (row, col)
                walkable[(row, col)] = "G"
            elif char == "R":
                walkable[(row, col)] = "R"

    if start is None or goal is None:
        return []

    path = [start]
    visited = {start}
    current = start

    while current != goal:
        row, col = current
        found_next = False

        for d_row, d_col in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            next_pos = (row + d_row, col + d_col)
            if next_pos in walkable and next_pos not in visited:
                path.append(next_pos)
                visited.add(next_pos)
                current = next_pos
                found_next = True
                break

        if not found_next:
            break

    return path


def count_turns(path: List[Point]) -> int:
    if len(path) < 3:
        return 0

    turn_count = 0
    previous_direction: str | None = None

    for index in range(1, len(path)):
        row_diff = path[index][0] - path[index - 1][0]
        col_diff = path[index][1] - path[index - 1][1]

        if row_diff == -1:
            direction = "UP"
        elif row_diff == 1:
            direction = "DOWN"
        elif col_diff == -1:
            direction = "LEFT"
        elif col_diff == 1:
            direction = "RIGHT"
        else:
            continue

        if previous_direction is not None and direction != previous_direction:
            turn_count += 1

        previous_direction = direction

    return turn_count


def analyze_mazes(file_path: Path) -> List[Dict]:
    parsed = parse_maze_view(file_path)
    results: List[Dict] = []

    for maze in parsed:
        path = find_path_coordinates(maze["grid"])
        results.append(
            {
                "map_num": maze["map_num"],
                "turns": count_turns(path),
                "header": maze["header"],
                "grid": maze["grid"],
                "path_length": len(path),
            }
        )

    return results


def save_sorted_mazes(results: List[Dict], output_path: Path, size: int) -> None:
    sorted_results = sorted(results, key=lambda item: item["turns"], reverse=True)

    with output_path.open("w", encoding="utf-8") as output_file:
        output_file.write("=" * 60 + "\n")
        output_file.write(f"Maze size: {size}x{size} (Total: {len(sorted_results)} mazes)\n")
        output_file.write("Sorted by turn count (descending)\n")
        output_file.write("=" * 60 + "\n\n")

        for maze in sorted_results:
            output_file.write("=" * 60 + "\n")
            output_file.write(maze["header"] + "\n")
            output_file.write(
                f"Path length: {maze['path_length']} | Turns: {maze['turns']}\n"
            )
            output_file.write("=" * 60 + "\n")
            output_file.write(maze["grid"] + "\n\n\n")


def sort_by_turns(
    base_dir: Path,
    language: str,
    min_size: int = 5,
    max_size: int = 20,
) -> None:
    view_dir = base_dir / "view"
    sort_dir = base_dir / "sortview"

    if not view_dir.exists():
        print(f"Error: {view_dir} ({_t(language, 'view_missing')})")
        return

    sort_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print(_t(language, "step3"))
    print("=" * 70)

    for size in range(min_size, max_size + 1):
        input_path = view_dir / f"{size}.txt"
        output_path = sort_dir / f"{size}.txt"

        if not input_path.exists():
            print(f"  {input_path}: {_t(language, 'skip_missing_file')}")
            continue

        results = analyze_mazes(input_path)
        if not results:
            print(f"  {size}x{size}: {_t(language, 'skip_empty')}")
            continue

        save_sorted_mazes(results, output_path, size)
        print(f"  saved: {output_path}")


def parse_sorted_maze_file(file_path: Path, top_n: int = 5) -> List[Dict]:
    content = file_path.read_text(encoding="utf-8")
    sections = content.split("=" * 60)
    mazes: List[Dict] = []

    for index in range(1, len(sections), 2):
        if index + 1 >= len(sections):
            break
        if len(mazes) >= top_n:
            break

        header = sections[index].strip()
        body = sections[index + 1].strip()

        if not body:
            continue

        map_match = re.search(r"Map #: (\d+)/(\d+)", header)
        turns_match = re.search(r"Turns: (\d+)", header)
        if not map_match or not turns_match:
            continue

        grid_lines = []
        for line in body.split("\n"):
            if not line:
                continue
            if line.startswith("="):
                continue
            if "Size:" in line or "Start:" in line or "Path length:" in line:
                continue
            grid_lines.append(line)

        if not grid_lines:
            continue

        mazes.append(
            {
                "map_num": int(map_match.group(1)),
                "turns": int(turns_match.group(1)),
                "grid_lines": grid_lines,
            }
        )

    return mazes


def _visualize_single_maze(ax: object, grid_lines: List[str], title: str) -> None:
    rows = len(grid_lines)
    cols = max(len(line) for line in grid_lines) if grid_lines else 0

    ax.set_xlim(0, cols)
    ax.set_ylim(0, rows)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(title, fontsize=10, fontweight="bold", pad=10)

    border = patches.Rectangle((0, 0), cols, rows, linewidth=2, edgecolor="black", facecolor="none")
    ax.add_patch(border)

    for row_index, line in enumerate(grid_lines):
        y = rows - row_index - 1
        for col_index, char in enumerate(line):
            x = col_index

            if char == "#":
                wall = patches.Rectangle((x, y), 1, 1, linewidth=0, facecolor="black")
                ax.add_patch(wall)
            elif char == "S":
                ax.text(
                    x + 0.5,
                    y + 0.5,
                    "S",
                    ha="center",
                    va="center",
                    fontsize=11,
                    fontweight="bold",
                    color="green",
                )
            elif char == "G":
                ax.text(
                    x + 0.5,
                    y + 0.5,
                    "G",
                    ha="center",
                    va="center",
                    fontsize=11,
                    fontweight="bold",
                    color="red",
                )


def create_visualization(mazes: List[Dict], size: int, output_path: Path) -> None:
    if not mazes:
        return

    figure, axes = plt.subplots(1, 5, figsize=(20, 5))
    figure.patch.set_facecolor("white")
    figure.suptitle(f"{size}x{size} Mazes - Top 5 by Most Turns", fontsize=16, fontweight="bold")

    for index, maze in enumerate(mazes[:5]):
        axis = axes[index]
        _visualize_single_maze(
            axis,
            maze["grid_lines"],
            title=f"#{maze['map_num']} - {maze['turns']} turns",
        )

    for index in range(len(mazes[:5]), 5):
        axes[index].axis("off")

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white", edgecolor="none")
    plt.close()


def visualize_top5_to_images(
    base_dir: Path,
    language: str,
    min_size: int = 5,
    max_size: int = 20,
) -> None:
    print("=" * 70)
    print(_t(language, "step4"))
    print("=" * 70)

    if not HAS_MATPLOTLIB:
        print(_t(language, "matplotlib_missing"))
        return

    sort_dir = base_dir / "sortview"
    img_dir = base_dir / "img"

    if not sort_dir.exists():
        print(f"Error: {sort_dir} ({_t(language, 'sort_missing')})")
        return

    img_dir.mkdir(parents=True, exist_ok=True)

    for size in range(min_size, max_size + 1):
        input_path = sort_dir / f"{size}.txt"
        output_path = img_dir / f"{size}.png"

        if not input_path.exists():
            print(f"  {input_path}: {_t(language, 'skip_missing_file')}")
            continue

        top_mazes = parse_sorted_maze_file(input_path, top_n=5)
        if not top_mazes:
            print(f"  {size}x{size}: {_t(language, 'skip_empty')}")
            continue

        create_visualization(top_mazes, size=size, output_path=output_path)
        print(f"  saved: {output_path}")


def run_full_pipeline(
    base_dir: Path,
    language: str = "en",
    min_size: int = 5,
    max_size: int = 20,
    attempts_per_size: int = 100,
    max_iterations: int = 500,
) -> None:
    print()
    print("=" * 70)
    print(_t(language, "pipeline_title"))
    print("=" * 70)

    generate_maze_maps(
        base_dir=base_dir,
        language=language,
        min_size=min_size,
        max_size=max_size,
        attempts_per_size=attempts_per_size,
        max_iterations=max_iterations,
    )
    visualize_maps_to_txt(base_dir=base_dir, language=language, min_size=min_size, max_size=max_size)
    sort_by_turns(base_dir=base_dir, language=language, min_size=min_size, max_size=max_size)
    visualize_top5_to_images(base_dir=base_dir, language=language, min_size=min_size, max_size=max_size)

    print("=" * 70)
    print(_t(language, "done"))
    print("=" * 70)
