"""Twist problems: one per pattern, each a variation on a problem from the 150 (twist_of).
They never appear in the games or the Study walkthroughs before you attempt them: they are the
"transfer check" at the end of each course and the first picks for mixed practice.
Generated and checked by an authoring script: each solution matched its brute force on 300 random inputs."""
from .problems import P, F, D

PROBLEMS_TWIST = []
PERF_TWIST = {}

PROBLEMS_TWIST.append(dict(P('pair_count', 151, 'Count Pairs With Target Sum', 'hashmap', 'Medium',
  'Given an integer array nums and an integer target, return how many index pairs i < j have nums[i] + nums[j] == target.',
  'Walk left to right; every earlier value equal to target - x makes one pair with x. A count map answers that in O(1).',
  "Look up BEFORE recording x, or x pairs with itself. Count values, don't store indices: duplicates each form their own pair.",
  'O(n)', 'O(n)',
  ['Can values repeat, and does each index pair count separately?', 'Can the array be empty?'],
  ['empty array -> 0', 'all values equal -> n·(n-1)/2 pairs', 'target needs a value paired with itself'],
  '''
def countPairs(nums, target):
    seen = {}
    count = 0
    for x in nums:
        count += seen.get(target - x, 0)  # <<
        seen[x] = seen.get(x, 0) + 1  # <<
    return count
''',
  F('countPairs', [([[1, 5, 7, -1, 5], 6], 3), ([[1, 1, 1, 1], 2], 6), ([[], 5], 0), ([[3], 6], 0), ([[2, 4, 3, 3, 2], 6], 3), ([[0, 0, 0], 0], 3)])),
  twist_of='two_sum', walk=('Check every pair i < j: O(n²).', ["count map 'seen' of values already passed", 'for each x:', '  add seen[target - x] to the answer', '  then record x in seen', 'return the answer']),
  brute_code='def countPairs(nums, target):\n    count = 0\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):   # every pair\n            if nums[i] + nums[j] == target:\n                count += 1\n    return count'))

PERF_TWIST['pair_count'] = ('n = 40,000', '''
def make(rng):
    return [[[rng.randint(-1000, 1000) for _ in range(40000)], rng.randint(-50, 50)]]
''')

PROBLEMS_TWIST.append(dict(P('closest_pair_sum', 152, 'Closest Pair Sum', 'two_pointers', 'Medium',
  'Given a sorted integer array nums (at least two values) and an integer target, return the smallest possible |nums[i] + nums[j] - target| over pairs i < j.',
  'On sorted data the pair sum moves predictably: too small means move the left pointer up, too big means move the right one down. Track the best gap as you go.',
  "Don't stop at the first pair; record the gap at every step, and an exact hit can return 0 immediately.",
  'O(n)', 'O(1)',
  ['Is nums guaranteed sorted ascending?', 'Do I return the gap or the pair itself?'],
  ['exactly two values', 'exact hit -> 0', 'all values equal'],
  '''
def closestPairDiff(nums, target):
    l, r = 0, len(nums) - 1
    best = float('inf')
    while l < r:
        s = nums[l] + nums[r]
        best = min(best, abs(s - target))  # <<
        if s < target:  # <<
            l += 1
        else:
            r -= 1  # <<
    return best
''',
  F('closestPairDiff', [([[1, 3, 4, 7, 10], 15], 1), ([[-5, -2, 0, 3], 1], 0), ([[1, 2], 10], 7), ([[2, 2, 2, 2], 4], 0), ([[-10, -3, 1, 8, 20], 0], 2)])),
  twist_of='two_sum_ii', walk=('Try every pair: O(n²).', ['l = 0, r = last, best = infinity', 'while l < r:', '  s = nums[l] + nums[r]; best = min(best, |s - target|)', '  s too small -> l += 1, otherwise r -= 1', 'return best']),
  brute_code="def closestPairDiff(nums, target):\n    best = float('inf')\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):   # every pair, ignoring that nums is sorted\n            best = min(best, abs(nums[i] + nums[j] - target))\n    return best"))

PERF_TWIST['closest_pair_sum'] = ('n = 40,000', '''
def make(rng):
    return [[sorted(rng.randint(-10**9, 10**9) for _ in range(40000)), rng.randint(-10**9, 10**9)]]
''')

PROBLEMS_TWIST.append(dict(P('longest_k_distinct', 153, 'Longest Subarray With At Most K Distinct', 'sliding_window', 'Medium',
  'Given an integer array nums and an integer k >= 1, return the length of the longest contiguous subarray that contains at most k distinct values.',
  'Grow the window on the right; while it holds more than k distinct values, shrink it from the left. A count map tells you when a value leaves the window entirely.',
  'Delete a value from the map when its count reaches 0, or len(count) overstates the distinct values.',
  'O(n)', 'O(k)',
  ['Contiguous subarray, not subsequence?', 'Is k at least 1?'],
  ['empty array -> 0', 'k larger than the number of distinct values -> whole array', 'all values equal'],
  '''
def longestKDistinct(nums, k):
    count = {}
    l = best = 0
    for r, x in enumerate(nums):
        count[x] = count.get(x, 0) + 1
        while len(count) > k:  # <<
            count[nums[l]] -= 1
            if count[nums[l]] == 0:
                del count[nums[l]]  # <<
            l += 1
        best = max(best, r - l + 1)  # <<
    return best
''',
  F('longestKDistinct', [([[1, 2, 1, 2, 3], 2], 4), ([[1, 2, 3, 4], 1], 1), ([[], 3], 0), ([[5, 5, 5], 1], 3), ([[1, 2, 1, 3, 4, 3, 5, 3], 2], 3), ([[4, 1, 1, 2, 3, 3], 3], 5)])),
  twist_of='longest_substring', walk=('Try every start and extend until there are too many distinct values: O(n²).', ['count map for the window, l = 0, best = 0', 'for each r: add nums[r] to the counts', '  while more than k distinct: drop nums[l] (delete it at 0), l += 1', '  best = max(best, window length)', 'return best']),
  brute_code='def longestKDistinct(nums, k):\n    best = 0\n    for i in range(len(nums)):\n        seen = set()\n        for j in range(i, len(nums)):       # every subarray starting at i\n            seen.add(nums[j])\n            if len(seen) > k:\n                break\n            best = max(best, j - i + 1)\n    return best'))

PERF_TWIST['longest_k_distinct'] = ('n = 40,000', '''
def make(rng):
    return [[[rng.randint(0, 999) for _ in range(40000)], 900]]
''')

PROBLEMS_TWIST.append(dict(P('ship_capacity', 154, 'Smallest Ship Capacity', 'binary_search', 'Medium',
  "weights[i] is the weight of package i. Packages ship in the given order: each day you load them until the next one would push the load over the ship's capacity. Return the smallest capacity that ships everything within days days.",
  'If a capacity works, every bigger one works too, so binary search on the answer between max(weights) and sum(weights), testing each guess with a greedy day count.',
  'The low end is max(weights): any smaller capacity can never carry the heaviest package.',
  'O(n log(sum))', 'O(1)',
  ['Must packages stay in their original order?', 'Is days at least 1 and at most len(weights)?'],
  ['days == 1 -> sum(weights)', 'days == len(weights) -> max(weights)', 'one package'],
  '''
def shipWithinDays(weights, days):
    def days_needed(cap):
        d, load = 1, 0
        for w in weights:
            if load + w > cap:
                d += 1
                load = 0
            load += w
        return d
    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= days:  # <<
            hi = mid  # <<
        else:
            lo = mid + 1  # <<
    return lo
''',
  F('shipWithinDays', [([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5], 15), ([[3, 2, 2, 4, 1, 4], 3], 6), ([[1, 2, 3, 1, 1], 4], 3), ([[7], 1], 7), ([[5, 5, 5, 5], 4], 5)])),
  twist_of='koko', walk=('Try every capacity from max(weights) upward: O(n·sum).', ['lo = max(weights), hi = sum(weights)', "days_needed(cap): load greedily, start a new day when the next one won't fit", 'while lo < hi: mid; if days_needed(mid) <= days -> hi = mid else lo = mid + 1', 'return lo']),
  brute_code='def shipWithinDays(weights, days):\n    cap = max(weights)\n    while True:                               # try every capacity upward\n        d, load = 1, 0\n        for w in weights:\n            if load + w > cap:\n                d, load = d + 1, 0\n            load += w\n        if d <= days:\n            return cap\n        cap += 1'))

PERF_TWIST['ship_capacity'] = ('10,000 packages up to 100,000', '''
def make(rng):
    return [[[rng.randint(1, 10**5) for _ in range(10000)], 5]]
''')

PROBLEMS_TWIST.append(dict(P('even_sum_paths', 155, 'Even-Sum Root-to-Leaf Paths', 'tree_dfs', 'Easy',
  'Given the root of a binary tree, count the root-to-leaf paths whose node values add up to an even number.',
  "Carry the running sum down the recursion; a leaf reports 1 or 0, and each node returns the sum of its children's counts.",
  "A leaf has no children at all; a node with one child is not a leaf, so don't count its missing side.",
  'O(n)', 'O(h)',
  ['Can values be negative?', 'What should an empty tree return?'],
  ['empty tree -> 0', 'single node', 'a node with only one child'],
  '''
def countEvenPaths(root):
    def dfs(node, total):
        if not node:
            return 0
        total += node.val  # <<
        if not node.left and not node.right:
            return 1 if total % 2 == 0 else 0  # <<
        return dfs(node.left, total) + dfs(node.right, total)  # <<
    return dfs(root, 0)
''',
  F('countEvenPaths', [([[1, 2, 3, 4, 5, None, 7]], 1), ([[2]], 1), ([[]], 0), ([[1, 1, None, 1, None, 1]], 1), ([[5, 3, 8, 1, 4, 7, 9]], 3)], arg_types=['tree'])),
  twist_of='good_nodes', walk=('Copy out every root-to-leaf path, then add each one up: O(n·h).', ['dfs(node, total): total += node.val', 'at a leaf: return 1 if total is even else 0', 'otherwise return dfs(left) + dfs(right)', 'empty child returns 0']),
  brute_code='def countEvenPaths(root):\n    paths = []\n    def collect(node, path):                  # store every full path, then sum each one\n        if not node:\n            return\n        path = path + [node.val]\n        if not node.left and not node.right:\n            paths.append(path)\n        collect(node.left, path)\n        collect(node.right, path)\n    collect(root, [])\n    return sum(1 for p in paths if sum(p) % 2 == 0)'))

PROBLEMS_TWIST.append(dict(P('max_level_sum', 156, 'Level With the Largest Sum', 'tree_bfs', 'Medium',
  'Given the root of a binary tree, return the 1-based level whose node values have the largest sum. If several levels tie, return the smallest one. Return 0 for an empty tree.',
  'Breadth-first search processes one level at a time: snapshot the queue length, sum exactly that many nodes, then compare with the best so far.',
  'Values can be negative, so start the best sum at minus infinity, not 0. Use > (not >=) to keep the earliest level on ties.',
  'O(n)', 'O(w)',
  ['Is the root level 1 or 0?', 'Which level wins on a tie?'],
  ['empty tree -> 0', 'all negative values', 'a deeper level with a bigger sum'],
  '''
def maxLevelSum(root):
    best, best_level, level = float('-inf'), 0, 0
    q = deque([root]) if root else deque()
    while q:
        level += 1
        total = 0
        for _ in range(len(q)):  # <<
            node = q.popleft()
            total += node.val
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        if total > best:  # <<
            best, best_level = total, level  # <<
    return best_level
''',
  F('maxLevelSum', [([[1, 7, 0, 7, -8, None, None]], 2), ([[989, None, 10250, 98693, -89388, None, None, None, -32127]], 2), ([[]], 0), ([[-1, -2, -3]], 1), ([[5]], 1)], arg_types=['tree'])),
  twist_of='level_order', walk=('Sum each level with its own full tree walk: O(n·h).', ['queue = [root], level = 0, best = -infinity', "while the queue isn't empty: level += 1", '  pop exactly len(queue) nodes, adding their values and pushing children', "  if this level's sum > best: remember it and the level", 'return the best level']),
  brute_code='def maxLevelSum(root):\n    def level_sum(node, d):                   # walk the whole tree again for every level\n        if not node:\n            return None\n        if d == 0:\n            return node.val\n        parts = [x for x in (level_sum(node.left, d - 1), level_sum(node.right, d - 1)) if x is not None]\n        return sum(parts) if parts else None\n    best, best_level, d = None, 0, 0\n    while True:\n        s = level_sum(root, d)\n        if s is None:\n            return best_level\n        if best is None or s > best:\n            best, best_level = s, d + 1\n        d += 1'))

PROBLEMS_TWIST.append(dict(P('closed_islands', 157, 'Islands Away From the Edge', 'grid_graph', 'Medium',
  "grid holds 1 for land and 0 for water. Count the islands (land connected up, down, left or right) that do not touch the grid's border.",
  'Flood-fill each island once, and while filling note whether any of its cells sits on the border. Only islands that never touch it count.',
  "Don't stop the fill when you hit the border: finish marking the whole island, or its other cells get counted as a separate island later.",
  'O(m·n)', 'O(m·n)',
  ['Does touching the border diagonally count?', 'Is land 1 and water 0?'],
  ['every island touches the border -> 0', 'a grid of one row', 'an island ringed by water in the middle'],
  '''
def closedIslands(grid):
    R, C = len(grid), len(grid[0])
    seen = set()
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] != 1 or (r, c) in seen:
                continue
            stack, closed = [(r, c)], True
            seen.add((r, c))
            while stack:
                y, x = stack.pop()
                if y in (0, R - 1) or x in (0, C - 1):  # <<
                    closed = False  # <<
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < R and 0 <= nx < C and grid[ny][nx] == 1 and (ny, nx) not in seen:
                        seen.add((ny, nx))
                        stack.append((ny, nx))
            count += closed  # <<
    return count
''',
  F('closedIslands', [([[[0, 0, 0, 0, 0], [0, 1, 1, 0, 0], [0, 1, 0, 0, 1], [0, 0, 0, 1, 1]]], 1), ([[[1, 1, 1], [1, 0, 1], [1, 1, 1]]], 0), ([[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], 1), ([[[1, 0, 1]]], 0), ([[[0, 0, 0, 0, 0, 0], [0, 1, 0, 1, 1, 0], [0, 1, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0]]], 2)])),
  twist_of='num_islands', walk=('Flood-fill again from every land cell: O((m·n)²).', ['for each unvisited land cell: flood-fill its island', '  while filling, closed = False if any cell is on the border', '  add 1 when the whole island stayed closed', 'return the count']),
  brute_code='def closedIslands(grid):\n    R, C = len(grid), len(grid[0])\n    def island(r0, c0):                       # flood fill from scratch, remembering nothing\n        seen, stack = {(r0, c0)}, [(r0, c0)]\n        while stack:\n            y, x = stack.pop()\n            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):\n                if 0 <= ny < R and 0 <= nx < C and grid[ny][nx] == 1 and (ny, nx) not in seen:\n                    seen.add((ny, nx))\n                    stack.append((ny, nx))\n        return seen\n    count = 0\n    for r in range(R):\n        for c in range(C):\n            if grid[r][c] == 1:\n                cells = island(r, c)\n                if min(cells) == (r, c) and all(0 < y < R - 1 and 0 < x < C - 1 for y, x in cells):\n                    count += 1\n    return count'))

PROBLEMS_TWIST.append(dict(P('climb_with_steps', 158, 'Climbing With Custom Steps', 'dp_1d', 'Medium',
  'You climb n stairs. Each move climbs exactly one of the step sizes in steps (positive, distinct). Return the number of different move sequences that land exactly on stair n, modulo 1,000,000,007.',
  'ways[i] = sum of ways[i - s] over every step size s that fits: the last move decides where you came from. Build it from 0 upward.',
  'ways[0] = 1 (one way to stand still), and take the modulo as you add, not only at the end.',
  'O(n·k)', 'O(n)',
  ['Does the order of moves matter (1+2 vs 2+1)?', 'Can n be 0?'],
  ['n = 0 -> 1', 'no step size fits -> 0', 'steps = [1] -> 1'],
  '''
def climbWays(n, steps):
    MOD = 10**9 + 7
    ways = [0] * (n + 1)
    ways[0] = 1  # <<
    for i in range(1, n + 1):
        for s in steps:
            if s <= i:
                ways[i] = (ways[i] + ways[i - s]) % MOD  # <<
    return ways[n]  # <<
''',
  F('climbWays', [([4, [1, 2]], 5), ([4, [1, 3, 5]], 3), ([0, [2]], 1), ([3, [2]], 0), ([10, [1, 2, 3]], 274), ([7, [3, 4]], 2)])),
  twist_of='climbing_stairs', walk=('Recursion trying every step size at every stair: O(k^n).', ['ways = [0] * (n + 1), ways[0] = 1', 'for i from 1 to n:', '  for each step s <= i: ways[i] += ways[i - s] (mod 1e9+7)', 'return ways[n]']),
  brute_code='def climbWays(n, steps):\n    def count(left):                          # try every step at every stair: exponential\n        if left == 0:\n            return 1\n        return sum(count(left - s) for s in steps if s <= left)\n    return count(n) % (10**9 + 7)'))

PERF_TWIST['climb_with_steps'] = ('n = 60', '''
def make(rng):
    return [[60, [1, 2, 3]]]
''')

PROBLEMS_TWIST.append(dict(P('top_k_words', 159, 'Top K Words', 'heap', 'Medium',
  'Given a list of words and an integer k (at most the number of distinct words), return the k most frequent words, most frequent first. Words with the same frequency come in alphabetical order.',
  'Count, then let a heap order by (-count, word): the tuple comparison handles both the frequency and the alphabetical tie-break.',
  'A max-frequency order with an alphabetical tie-break is exactly (-count, word) ascending; mixing the signs is the usual bug.',
  'O(n + k log n)', 'O(n)',
  ['How are ties ordered?', 'Is k always at most the number of distinct words?'],
  ['all words distinct -> alphabetical', 'k = 1', 'one word repeated'],
  '''
def topKWords(words, k):
    count = Counter(words)
    heap = [(-c, w) for w, c in count.items()]  # <<
    heapq.heapify(heap)
    return [heapq.heappop(heap)[1] for _ in range(k)]  # <<
''',
  F('topKWords', [([['i', 'love', 'leetcode', 'i', 'love', 'coding'], 2], ['i', 'love']), ([['the', 'day', 'is', 'sunny', 'the', 'the', 'the', 'sunny', 'is', 'is'], 4], ['the', 'is', 'sunny', 'day']), ([['b', 'a', 'c'], 3], ['a', 'b', 'c']), ([['x'], 1], ['x']), ([['aa', 'a', 'aa', 'a'], 1], ['a'])])),
  twist_of='kth_largest_array', walk=('Count, then sort every distinct word: O(n log n).', ['count each word', 'heap of (-count, word)', 'pop k times', 'return the popped words']),
  brute_code='def topKWords(words, k):\n    count = {}\n    for w in words:\n        count[w] = count.get(w, 0) + 1\n    # sort every distinct word by (-count, word)\n    return sorted(count, key=lambda w: (-count[w], w))[:k]'))

PROBLEMS_TWIST.append(dict(P('covered_length', 160, 'Total Covered Length', 'intervals', 'Medium',
  'Given intervals [start, end) on a number line (start < end), return the total length covered by at least one interval.',
  "Sort by start and sweep: extend the current block while the next interval overlaps it, and add the block's length when a gap appears.",
  'Remember to add the last open block after the loop.',
  'O(n log n)', 'O(1) extra',
  ['Are the ends exclusive?', 'Can intervals be given in any order?'],
  ['no intervals -> 0', 'one interval inside another', 'touching intervals [1,3) and [3,5)'],
  '''
def coveredLength(intervals):
    total = 0
    cur_s = cur_e = None
    for s, e in sorted(intervals):
        if cur_e is None or s > cur_e:  # <<
            if cur_e is not None:
                total += cur_e - cur_s
            cur_s, cur_e = s, e  # <<
        else:
            cur_e = max(cur_e, e)  # <<
    if cur_e is not None:
        total += cur_e - cur_s
    return total
''',
  F('coveredLength', [([[[1, 3], [2, 5], [7, 8]]], 5), ([[]], 0), ([[[0, 10], [2, 3]]], 10), ([[[1, 3], [3, 5]]], 4), ([[[5, 6], [1, 2], [1, 4]]], 4)])),
  twist_of='merge_intervals', walk=('Mark every unit point each interval covers: O(total length).', ['sort by start', 'keep the current block [cur_s, cur_e)', 'next starts after cur_e -> add the block, start a new one', 'otherwise extend cur_e', 'add the last block; return the total']),
  brute_code='def coveredLength(intervals):\n    covered = set()\n    for s, e in intervals:                    # mark every unit of every interval\n        covered.update(range(s, e))\n    return len(covered)'))

PROBLEMS_TWIST.append(dict(P('remove_adjacent_pairs', 161, 'Remove Adjacent Equal Pairs', 'stack', 'Easy',
  'Repeatedly delete two adjacent equal letters from the string s until no such pair remains. Return the final string.',
  "A stack holds what's left so far: a letter equal to the top cancels it, otherwise it's pushed. One pass handles every chain reaction.",
  'Removing a pair can make two letters that were apart adjacent; the stack handles that for free, a single left-to-right scan does not.',
  'O(n)', 'O(n)',
  ['Only pairs of equal letters, not longer runs?', 'Lowercase letters only?'],
  ['empty string', "everything cancels -> ''", "'abba' -> ''"],
  '''
def removeDuplicates(s):
    stack = []
    for ch in s:
        if stack and stack[-1] == ch:  # <<
            stack.pop()  # <<
        else:
            stack.append(ch)
    return ''.join(stack)  # <<
''',
  F('removeDuplicates', [(['abbaca'], 'ca'), (['azxxzy'], 'ay'), ([''], ''), (['abba'], ''), (['abc'], 'abc')])),
  twist_of='valid_parentheses', walk=('Rescan from the start after every deletion: O(n²).', ['stack = []', 'for each letter: if it equals the top, pop; else push', 'return the stack joined into a string']),
  brute_code='def removeDuplicates(s):\n    changed = True\n    while changed:                            # rescan from the start after every deletion\n        changed = False\n        for i in range(len(s) - 1):\n            if s[i] == s[i + 1]:\n                s = s[:i] + s[i + 2:]\n                changed = True\n                break\n    return s'))

PERF_TWIST['remove_adjacent_pairs'] = ('n = 100,000', '''
def make(rng):
    half = ''.join('abcdefghij'[i % 10] for i in range(50000))
    return [[half + half[::-1]]]
''')

PROBLEMS_TWIST.append(dict(P('delete_middle', 162, 'Delete the Middle Node', 'linked_list', 'Medium',
  'Delete the middle node of a linked list, the one at index len // 2 (0-based), and return the head. A one-node list becomes empty.',
  'Slow and fast pointers: when fast reaches the end, slow is just before the middle, so it can unlink it in one step.',
  'Start fast two steps ahead so slow stops one node BEFORE the middle; handle the one-node list first.',
  'O(n)', 'O(1)',
  ['For an even length, which middle (len // 2)?', 'Return the head of the changed list?'],
  ['one node -> empty', 'two nodes -> delete the second', 'odd and even lengths'],
  '''
def deleteMiddle(head):
    if not head or not head.next:
        return None
    slow, fast = head, head.next.next  # <<
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next  # <<
    slow.next = slow.next.next  # <<
    return head
''',
  F('deleteMiddle', [([[1, 3, 4, 7, 1, 2, 6]], [1, 3, 4, 1, 2, 6]), ([[1, 2, 3, 4]], [1, 2, 4]), ([[2, 1]], [2]), ([[1]], []), ([[5, 6, 7]], [5, 7])], arg_types=['linked'], ret_type='linked')),
  twist_of='remove_nth', walk=('Count the nodes, then walk again to the middle: two passes, O(n).', ['handle 0 or 1 node', 'slow = head, fast = head.next.next', 'move slow 1 and fast 2 while fast and fast.next', 'slow.next = slow.next.next; return head']),
  brute_code='def deleteMiddle(head):\n    n, cur = 0, head                          # first pass: count\n    while cur:\n        n, cur = n + 1, cur.next\n    if n <= 1:\n        return None\n    cur = head                                # second pass: walk to just before the middle\n    for _ in range(n // 2 - 1):\n        cur = cur.next\n    cur.next = cur.next.next\n    return head'))

PROBLEMS_TWIST.append(dict(P('combination_sum_k', 163, 'K Numbers From 1-9 Adding Up to N', 'backtracking', 'Medium',
  'Return every combination of k distinct numbers from 1 to 9 that adds up to n. Each combination lists its numbers in increasing order; the combinations can come in any order.',
  'Choose numbers in increasing order so each set is built once; stop when the path has k numbers, and prune as soon as the total would pass n.',
  'Only record a path when it has exactly k numbers AND the right total; length k with the wrong total is a dead end.',
  'O(C(9, k))', 'O(k)',
  ['Can a number be used twice?', 'Does the order of combinations matter?'],
  ['no combination exists -> []', 'k = 1', 'n larger than the biggest possible sum'],
  '''
def combinationSum3(k, n):
    res = []
    def bt(start, path, total):
        if len(path) == k:
            if total == n:  # <<
                res.append(path[:])
            return
        for x in range(start, 10):
            if total + x > n:  # <<
                break
            path.append(x)
            bt(x + 1, path, total + x)  # <<
            path.pop()
    bt(1, [], 0)
    return res
''',
  F('combinationSum3', [([3, 7], [[1, 2, 4]]), ([3, 9], [[1, 2, 6], [1, 3, 5], [2, 3, 4]]), ([4, 1], []), ([1, 5], [[5]]), ([2, 18], [])], compare='unordered_nested')),
  twist_of='combination_sum', walk=('Check all 512 subsets of 1..9: O(2^9 · 9).', ['bt(start, path, total)', 'if path has k numbers: record it when total == n; stop', 'for x from start to 9: stop if total + x > n', '  choose x, recurse with x + 1, undo']),
  brute_code='def combinationSum3(k, n):\n    res = []\n    for mask in range(1 << 9):                # every subset of 1..9\n        nums = [i + 1 for i in range(9) if mask >> i & 1]\n        if len(nums) == k and sum(nums) == n:\n            res.append(nums)\n    return res'))

PROBLEMS_TWIST.append(dict(P('next_greater_circular', 164, 'Next Greater Value, Circular', 'mono_stack', 'Medium',
  'For each element of the circular array nums, return the next greater value met by walking forward (wrapping around to the start), or -1 if there is none.',
  'A decreasing stack of indices still waiting for an answer; walk the array twice (i from 0 to 2n - 1) so values near the end can find answers at the start.',
  'Only push indices during the first pass; the second pass exists to answer them, not to add new ones.',
  'O(n)', 'O(n)',
  ['Does the walk wrap only once?', 'Strictly greater, or greater-or-equal?'],
  ['one value -> [-1]', 'all equal -> all -1', 'the maximum -> -1'],
  '''
def nextGreaterElements(nums):
    n = len(nums)
    res = [-1] * n
    stack = []
    for i in range(2 * n):  # <<
        x = nums[i % n]
        while stack and nums[stack[-1]] < x:  # <<
            res[stack.pop()] = x
        if i < n:
            stack.append(i)  # <<
    return res
''',
  F('nextGreaterElements', [([[1, 2, 1]], [2, -1, 2]), ([[1, 2, 3, 4, 3]], [2, 3, 4, -1, 4]), ([[5]], [-1]), ([[2, 2, 2]], [-1, -1, -1]), ([[3, 8, 4, 1, 2]], [8, -1, 8, 2, 3])])),
  twist_of='daily_temperatures', walk=('Walk forward around the circle from every index: O(n²).', ['res = [-1] * n, stack of waiting indices', 'for i in 0 .. 2n - 1: x = nums[i % n]', '  pop every waiting index with a smaller value; its answer is x', '  push i only while i < n', 'return res']),
  brute_code='def nextGreaterElements(nums):\n    n = len(nums)\n    res = [-1] * n\n    for i in range(n):\n        for step in range(1, n):              # walk forward around the circle from every index\n            if nums[(i + step) % n] > nums[i]:\n                res[i] = nums[(i + step) % n]\n                break\n    return res'))

PERF_TWIST['next_greater_circular'] = ('n = 40,000', '''
def make(rng):
    return [[list(range(40000, 0, -1))]]
''')

PROBLEMS_TWIST.append(dict(P('subarray_sum_k', 165, 'Subarrays Adding Up to K', 'prefix', 'Medium',
  'Given an integer array nums (values can be negative) and an integer k, return how many contiguous subarrays add up to exactly k.',
  'A subarray sums to k exactly when two prefix sums differ by k. Count prefix sums seen so far; each earlier prefix equal to total - k ends one subarray here.',
  'Seed the map with {0: 1} so subarrays starting at index 0 are counted. A sliding window fails because of negatives.',
  'O(n)', 'O(n)',
  ['Can values be negative or zero?', 'Do overlapping subarrays count separately?'],
  ['empty array -> 0', 'zeros make many equal prefixes', 'k = 0'],
  '''
def subarraySum(nums, k):
    count = total = 0
    seen = {0: 1}  # <<
    for x in nums:
        total += x
        count += seen.get(total - k, 0)  # <<
        seen[total] = seen.get(total, 0) + 1  # <<
    return count
''',
  F('subarraySum', [([[1, 1, 1], 2], 2), ([[1, 2, 3], 3], 2), ([[], 0], 0), ([[0, 0, 0], 0], 6), ([[3, 4, -7, 1, 3, 3, 1, -4], 7], 4)])),
  twist_of='product_except_self', walk=('Add up every subarray: O(n²).', ['seen = {0: 1}, total = 0, count = 0', 'for each x: total += x', '  count += seen[total - k]', '  seen[total] += 1', 'return count']),
  brute_code='def subarraySum(nums, k):\n    count = 0\n    for i in range(len(nums)):\n        total = 0\n        for j in range(i, len(nums)):         # every subarray nums[i..j]\n            total += nums[j]\n            if total == k:\n                count += 1\n    return count'))

PERF_TWIST['subarray_sum_k'] = ('n = 40,000', '''
def make(rng):
    return [[[rng.randint(-100, 100) for _ in range(40000)], 50]]
''')

PROBLEMS_TWIST.append(dict(P('assign_cookies', 166, 'Hand Out Cookies', 'greedy', 'Easy',
  'Child i is content with any cookie of size at least greed[i]. Each child gets at most one cookie and each cookie goes to at most one child. Return the largest number of content children.',
  "Sort both. Walk the cookies smallest first; each one goes to the least greedy child still waiting if it's big enough. A smaller cookie is never better spent on a greedier child.",
  'Advance through cookies even when one is too small; only advance the child pointer on a match.',
  'O(n log n + m log m)', 'O(1) extra',
  ['Can a child get more than one cookie?', 'Are sizes and greed values positive?'],
  ['no cookies -> 0', 'every cookie too small -> 0', 'more cookies than children'],
  '''
def findContentChildren(greed, sizes):
    greed, sizes = sorted(greed), sorted(sizes)
    i = 0
    for s in sizes:
        if i < len(greed) and s >= greed[i]:  # <<
            i += 1  # <<
    return i
''',
  F('findContentChildren', [([[1, 2, 3], [1, 1]], 1), ([[1, 2], [1, 2, 3]], 2), ([[3], []], 0), ([[5, 6], [1, 2]], 0), ([[2, 3, 1], [3, 1, 1]], 2)])),
  twist_of='hand_of_straights', walk=('For each child, scan for the smallest cookie that fits: O(n·m).', ['sort greed and sizes', 'i = index of the next child to feed', 'for each cookie size s: if s >= greed[i], feed that child (i += 1)', 'return i']),
  brute_code='def findContentChildren(greed, sizes):\n    left = sorted(sizes)\n    content = 0\n    for g in sorted(greed):                   # scan for the smallest unused cookie that fits each child\n        for i, s in enumerate(left):\n            if s >= g:\n                left.pop(i)\n                content += 1\n                break\n    return content'))

PERF_TWIST['assign_cookies'] = ('30,000 children and cookies', '''
def make(rng):
    # most cookies are too small for every child, so a scan for "the smallest cookie that fits" reads them all
    return [[[2] * 30000, [1] * 29000 + [2] * 1000]]
''')

PROBLEMS_TWIST.append(dict(P('min_semesters', 167, 'Fewest Semesters', 'topo_sort', 'Medium',
  "Courses are labelled 1 to n. relations[i] = [a, b] means course a must be finished before course b. You can take any number of courses in a semester once their prerequisites are done. Return the fewest semesters needed to take every course, or -1 if it's impossible.",
  "Kahn's algorithm level by level: everything with no remaining prerequisites forms one semester. The number of levels is the answer; leftover courses mean a cycle.",
  'Count a semester per BFS level, not per course, and return -1 when fewer than n courses were taken.',
  'O(n + e)', 'O(n + e)',
  ['Is there any limit on courses per semester?', 'Are courses numbered from 1?'],
  ['no relations -> 1', 'a cycle -> -1', 'a single chain -> n'],
  '''
def minimumSemesters(n, relations):
    adj = defaultdict(list)
    indeg = [0] * (n + 1)
    for a, b in relations:
        adj[a].append(b)
        indeg[b] += 1
    q = deque(i for i in range(1, n + 1) if indeg[i] == 0)
    semesters = taken = 0
    while q:
        semesters += 1  # <<
        for _ in range(len(q)):  # <<
            u = q.popleft()
            taken += 1
            for v in adj[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)
    return semesters if taken == n else -1  # <<
''',
  F('minimumSemesters', [([3, [[1, 3], [2, 3]]], 2), ([3, [[1, 2], [2, 3], [3, 1]]], -1), ([4, []], 1), ([4, [[1, 2], [2, 3], [3, 4]]], 4), ([5, [[1, 5], [2, 5], [5, 3], [4, 3]]], 3)])),
  twist_of='course_schedule_ii', walk=('Each semester, sweep every course and recheck its prerequisites: O(n²·e).', ['count incoming edges', 'queue = courses with none', 'each round of the queue is one semester; removing a course frees its followers', 'return semesters if every course was taken, else -1']),
  brute_code='def minimumSemesters(n, relations):\n    done, semesters = set(), 0\n    while len(done) < n:                      # each semester, sweep every course again\n        ready = [c for c in range(1, n + 1) if c not in done and all(a in done for a, b in relations if b == c)]\n        if not ready:\n            return -1\n        done.update(ready)\n        semesters += 1\n    return semesters'))

PERF_TWIST['min_semesters'] = ('3,000 courses in a chain', '''
def make(rng):
    rel = [[i + 1, i] for i in range(1, 3000)]
    rng.shuffle(rel)
    return [[3000, rel]]
''')

PROBLEMS_TWIST.append(dict(P('min_path_sum', 168, 'Cheapest Path Through a Grid', 'dp_2d', 'Medium',
  'grid holds non-negative costs. Moving only right or down from the top-left cell to the bottom-right cell, return the smallest possible total cost of the cells on the path, both ends included.',
  'The cheapest way into a cell comes from the cheaper of the cell above and the cell to the left; fill the table row by row.',
  "The first row and first column have only one way in, so they're running sums.",
  'O(m·n)', 'O(m·n)',
  ['Only right and down moves?', 'Are both end cells counted?'],
  ['a single cell', 'a single row', 'zeros everywhere'],
  '''
def minPathSum(grid):
    R, C = len(grid), len(grid[0])
    dp = [[0] * C for _ in range(R)]
    for r in range(R):
        for c in range(C):
            if r == 0 and c == 0:
                dp[r][c] = grid[0][0]
            elif r == 0:
                dp[r][c] = dp[r][c - 1] + grid[r][c]  # <<
            elif c == 0:
                dp[r][c] = dp[r - 1][c] + grid[r][c]  # <<
            else:
                dp[r][c] = min(dp[r - 1][c], dp[r][c - 1]) + grid[r][c]  # <<
    return dp[-1][-1]
''',
  F('minPathSum', [([[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], 7), ([[[1, 2, 3], [4, 5, 6]]], 12), ([[[7]]], 7), ([[[1, 2, 3, 4]]], 10), ([[[0, 0], [0, 0]]], 0)])),
  twist_of='unique_paths', walk=('Recursion over every path, recomputing shared cells: O(2^(m+n)).', ['dp[0][0] = grid[0][0]', 'first row / column: running sums', 'every other cell: min(above, left) + its cost', 'return the bottom-right value']),
  brute_code='def minPathSum(grid):\n    R, C = len(grid), len(grid[0])\n    def best(r, c):                           # every path, recomputing shared cells: exponential\n        if r == R - 1 and c == C - 1:\n            return grid[r][c]\n        options = []\n        if r + 1 < R:\n            options.append(best(r + 1, c))\n        if c + 1 < C:\n            options.append(best(r, c + 1))\n        return grid[r][c] + min(options)\n    return best(0, 0)'))

PERF_TWIST['min_path_sum'] = ('16 x 16', '''
def make(rng):
    return [[[[rng.randint(0, 9) for _ in range(16)] for _ in range(16)]]]
''')

PROBLEMS_TWIST.append(dict(P('count_provinces', 169, 'Count Provinces', 'union_find', 'Medium',
  'isConnected is an n x n matrix where isConnected[i][j] = 1 means cities i and j are directly connected. A province is a group of cities connected directly or through other cities. Return the number of provinces.',
  'Start with n separate groups and union each connected pair; every successful union merges two groups into one.',
  'Only decrease the count when the two cities had different roots, or already-joined pairs get counted twice.',
  'O(n² · α(n))', 'O(n)',
  ['Is the matrix symmetric with 1s on the diagonal?', 'Is a lone city its own province?'],
  ['no connections -> n', 'everything connected -> 1', 'a single city'],
  '''
def findCircleNum(isConnected):
    n = len(isConnected)
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    groups = n
    for i in range(n):
        for j in range(i + 1, n):
            if isConnected[i][j]:
                a, b = find(i), find(j)
                if a != b:  # <<
                    parent[a] = b  # <<
                    groups -= 1  # <<
    return groups
''',
  F('findCircleNum', [([[[1, 1, 0], [1, 1, 0], [0, 0, 1]]], 2), ([[[1, 0, 0], [0, 1, 0], [0, 0, 1]]], 3), ([[[1]]], 1), ([[[1, 1, 1], [1, 1, 1], [1, 1, 1]]], 1), ([[[1, 0, 0, 1], [0, 1, 1, 0], [0, 1, 1, 1], [1, 0, 1, 1]]], 1)])),
  twist_of='count_components', walk=('Keep spreading the smallest label along every connection until nothing changes: O(n³).', ['parent[i] = i, groups = n', 'for each pair i < j with a connection: find both roots', '  different roots -> union them, groups -= 1', 'return groups']),
  brute_code='def findCircleNum(isConnected):\n    n = len(isConnected)\n    label = list(range(n))\n    changed = True\n    while changed:                            # keep spreading the smallest label until nothing changes\n        changed = False\n        for i in range(n):\n            for j in range(n):\n                if isConnected[i][j] and label[j] < label[i]:\n                    label[i], changed = label[j], True\n    return len(set(label))'))

PROBLEMS_TWIST.append(dict(P('prefix_counter', 170, 'Prefix Counter', 'trie', 'Medium',
  'Design PrefixCounter: insert(word) adds a word (adding the same word again counts again), and countPrefix(prefix) returns how many inserted words start with prefix. An empty prefix matches every word.',
  'A trie where every node stores how many inserted words pass through it; counting a prefix is one walk down and a read.',
  'Bump the count on the root too, so the empty prefix returns the total; return 0 as soon as a letter is missing.',
  'O(L) per call', 'O(total letters)',
  ['Do duplicate inserts count twice?', 'What does an empty prefix return?'],
  ['empty prefix -> all words', 'prefix longer than every word -> 0', 'duplicate inserts'],
  '''
class PrefixCounter:
    def __init__(self):
        self.root = {}
    def insert(self, word):
        node = self.root
        node['#'] = node.get('#', 0) + 1  # <<
        for ch in word:
            node = node.setdefault(ch, {})
            node['#'] = node.get('#', 0) + 1  # <<
    def countPrefix(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node:
                return 0  # <<
            node = node[ch]
        return node.get('#', 0)
''',
  D('PrefixCounter', [(['PrefixCounter', 'insert', 'insert', 'insert', 'countPrefix', 'countPrefix', 'countPrefix', 'countPrefix'], [[], ['apple'], ['app'], ['apple'], ['app'], ['apple'], ['b'], ['']], [None, None, None, None, 3, 2, 0, 3]), (['PrefixCounter', 'countPrefix', 'insert', 'countPrefix', 'countPrefix'], [[], ['a'], ['abc'], ['abcd'], ['ab']], [None, 0, None, 0, 1])])),
  twist_of='implement_trie', walk=('Keep a list and scan every word per query: O(n·L) per count.', ["trie of dicts; each node stores '#' = words passing through", 'insert: bump the root and every node on the path', 'countPrefix: walk down; missing letter -> 0', 'return the count at the last node']),
  brute_code='class PrefixCounter:\n    def __init__(self):\n        self.words = []                        # keep every word in a list\n    def insert(self, word):\n        self.words.append(word)\n    def countPrefix(self, prefix):\n        return sum(1 for w in self.words if w.startswith(prefix))   # scan them all'))

PERF_TWIST['prefix_counter'] = ('40,000 operations', '''
def make(rng):
    ops, args = ['PrefixCounter'], [[]]
    for _ in range(20000):
        ops.append('insert'); args.append([''.join(rng.choice('abcde') for _ in range(8))])
    for _ in range(20000):
        ops.append('countPrefix'); args.append([''.join(rng.choice('abcde') for _ in range(3))])
    return [[ops, args]]
''')

PROBLEMS_TWIST.append(dict(P('min_effort_path', 171, 'Least-Effort Route', 'shortest_path', 'Medium',
  "heights is a grid. A route's effort is the largest absolute height difference between two consecutive cells on it. Moving up, down, left or right from the top-left to the bottom-right cell, return the smallest possible effort.",
  "Dijkstra where a path's cost is its biggest step, not its sum: always extend the route with the smallest effort so far, and the first time you pop the target its effort is optimal.",
  'The new effort is max(current effort, this step), not a sum; skip stale heap entries.',
  'O(m·n log(m·n))', 'O(m·n)',
  ['Effort is the maximum step, not the total?', 'Four directions only?'],
  ['a single cell -> 0', 'a single row', 'all heights equal -> 0'],
  '''
def minimumEffortPath(heights):
    R, C = len(heights), len(heights[0])
    best = [[float('inf')] * C for _ in range(R)]
    best[0][0] = 0
    heap = [(0, 0, 0)]
    while heap:
        e, r, c = heapq.heappop(heap)
        if (r, c) == (R - 1, C - 1):
            return e  # <<
        if e > best[r][c]:
            continue
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C:
                ne = max(e, abs(heights[nr][nc] - heights[r][c]))  # <<
                if ne < best[nr][nc]:
                    best[nr][nc] = ne
                    heapq.heappush(heap, (ne, nr, nc))  # <<
    return 0
''',
  F('minimumEffortPath', [([[[1, 2, 2], [3, 8, 2], [5, 3, 5]]], 2), ([[[1, 2, 3], [3, 8, 4], [5, 3, 5]]], 1), ([[[7]]], 0), ([[[1, 10, 6, 7, 9, 10, 4, 9]]], 9), ([[[4, 4], [4, 4]]], 0)])),
  twist_of='swim_rising_water', walk=('Try every effort limit from 0 upward with a fresh search: O(H·m·n), H = height range.', ['best effort to each cell = infinity, heap = [(0, start)]', 'pop the smallest effort; the target popped means done', 'for each neighbour: new = max(effort, step)', '  better than its best -> record and push']),
  brute_code='def minimumEffortPath(heights):\n    R, C = len(heights), len(heights[0])\n    limit = 0\n    while True:                               # try every effort limit upward, with a fresh search each time\n        seen, stack = {(0, 0)}, [(0, 0)]\n        while stack:\n            r, c = stack.pop()\n            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):\n                if 0 <= nr < R and 0 <= nc < C and (nr, nc) not in seen and abs(heights[nr][nc] - heights[r][c]) <= limit:\n                    seen.add((nr, nc))\n                    stack.append((nr, nc))\n        if (R - 1, C - 1) in seen:\n            return limit\n        limit += 1'))

PERF_TWIST['min_effort_path'] = ('60 x 60 heights up to 10^6', '''
def make(rng):
    return [[[[rng.randint(0, 10**6) for _ in range(60)] for _ in range(60)]]]
''')

PROBLEMS_TWIST.append(dict(P('two_single_numbers', 172, 'Two Numbers That Appear Once', 'bit', 'Medium',
  'Every value in nums appears exactly twice, except two different values that appear once. Return those two values, in any order.',
  'XOR everything to get a ^ b. Any set bit of that differs between a and b, so split the numbers by that bit and XOR each half: pairs cancel, leaving a and b.',
  'x & -x isolates the lowest set bit; the two halves must be split by the same bit.',
  'O(n)', 'O(1)',
  ['Exactly two values appear once?', 'Does the order of the answer matter?'],
  ['just the two values', 'negative values', 'zero is one of them'],
  '''
def singleNumbers(nums):
    xor = 0
    for x in nums:
        xor ^= x
    bit = xor & -xor  # <<
    a = 0
    for x in nums:
        if x & bit:  # <<
            a ^= x  # <<
    return [a, xor ^ a]
''',
  F('singleNumbers', [([[1, 2, 1, 3, 2, 5]], [3, 5]), ([[-1, 0]], [-1, 0]), ([[0, 1]], [1, 0]), ([[4, 7, 4, 9, 9, -3]], [7, -3]), ([[8, 8, 6, 2]], [6, 2])], compare='unordered')),
  twist_of='single_number', walk=('Count each value by scanning the list: O(n²).', ['xor of everything = a ^ b', 'bit = lowest set bit of that', 'xor only the numbers with that bit set -> a', 'return [a, (a ^ b) ^ a]']),
  brute_code='def singleNumbers(nums):\n    # nums.count scans the whole list for every value\n    return [x for x in nums if nums.count(x) == 1]'))

PERF_TWIST['two_single_numbers'] = ('n = 40,002', '''
def make(rng):
    vals = rng.sample(range(-10**9, 10**9), 20001)
    nums = vals[:20000] * 2 + vals[20000:] + [10**9 + 7]
    rng.shuffle(nums)
    return [[nums]]
''')

PROBLEMS_TWIST.append(dict(P('diagonal_order', 173, 'Zig-Zag Diagonal Order', 'matrix_math', 'Medium',
  'Return every element of an m x n matrix in zig-zag diagonal order: the first diagonal runs up and to the right, the next down and to the left, alternating.',
  "Cells on diagonal d satisfy row + col = d. List each diagonal's cells top to bottom and reverse every even-numbered one.",
  'Clamp the row range for each diagonal to the matrix: rows from max(0, d - n + 1) to min(m - 1, d).',
  'O(m·n)', 'O(m·n)',
  ['Which direction does the first diagonal go?', 'Can the matrix be a single row or column?'],
  ['one cell', 'a single row', 'a single column'],
  '''
def findDiagonalOrder(mat):
    R, C = len(mat), len(mat[0])
    res = []
    for d in range(R + C - 1):
        cells = [(r, d - r) for r in range(max(0, d - C + 1), min(R, d + 1))]  # <<
        if d % 2 == 0:
            cells.reverse()  # <<
        res.extend(mat[r][c] for r, c in cells)  # <<
    return res
''',
  F('findDiagonalOrder', [([[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [1, 2, 4, 7, 5, 3, 6, 8, 9]), ([[[1, 2], [3, 4]]], [1, 2, 3, 4]), ([[[5]]], [5]), ([[[1, 2, 3, 4]]], [1, 2, 3, 4]), ([[[1], [2], [3]]], [1, 2, 3])])),
  twist_of='spiral_matrix', walk=('Walk cell by cell, bouncing off the edges: O(m·n), but easy to get the corners wrong.', ['for each diagonal d = row + col from 0 to m + n - 2', '  list its cells top to bottom (rows clamped to the matrix)', '  reverse it when d is even', 'append the values']),
  brute_code='def findDiagonalOrder(mat):\n    R, C = len(mat), len(mat[0])\n    res, r, c, up = [], 0, 0, True\n    for _ in range(R * C):                    # walk cell by cell, bouncing off the edges\n        res.append(mat[r][c])\n        if up:\n            if c == C - 1:\n                r, up = r + 1, False\n            elif r == 0:\n                c, up = c + 1, False\n            else:\n                r, c = r - 1, c + 1\n        else:\n            if r == R - 1:\n                c, up = c + 1, True\n            elif c == 0:\n                r, up = r + 1, True\n            else:\n                r, c = r + 1, c - 1\n    return res'))
