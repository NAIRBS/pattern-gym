"""The skeletons. Each is the reusable code shape behind a family of problems.

fill = the questions you answer to turn the skeleton into a specific solution.
"""

PATTERNS = [
    {
        "id": "recursion", "name": "Recursion (base case + smaller call)", "color": "#9fb35f",
        "triggers": ["the definition refers to itself", "answer for n from the answer for n - 1 or n / 2", "self-similar structure", "a process that shrinks by one each round"],
        "fill": ["What is the smallest input, and its answer? (base case)", "What smaller input do you call on?", "How do you build this answer from the smaller one?", "Do the same calls repeat? Then remember them."],
        "skeleton": '''
def solve(n):
    if n <= 1:                 # base case: answer directly
        return base
    smaller = solve(n - 1)     # trust the call on a smaller input
    return combine(n, smaller)
''',
    },
    {
        "id": "hashmap", "name": "Hash Map / Set Lookup", "color": "#e8a33d",
        "triggers": ["'have I seen X before?'", "pair/complement lookup", "count frequencies", "group by a canonical key"],
        "fill": ["What is the key? (value, complement, sorted string, count tuple)", "What is stored as the value?", "Check before or after inserting?"],
        "skeleton": '''
seen = {}                      # key -> what you need later
for i, x in enumerate(nums):
    key = ...                  # the thing you'd look up
    if key in seen:            # check BEFORE insert
        return ...
    seen[x] = i
return ...
''',
    },
    {
        "id": "prefix", "name": "Prefix / Running Sum", "color": "#d4883a",
        "triggers": ["sum of a range, asked many times", "product/sum of everything except i", "subarray sum equals k", "left side vs right side"],
        "fill": ["What accumulates left-to-right (sum, product, count)?", "What is the identity value (0 or 1)?", "Do you need the whole array, or just a running total?", "Do you need a second pass right-to-left?"],
        "skeleton": '''
pre = [0] * (len(nums) + 1)    # pre[i] = sum of the first i values
for i, x in enumerate(nums):
    pre[i + 1] = pre[i] + x    # one more value than the last prefix
# sum of nums[l..r], inclusive, in O(1):
return pre[r + 1] - pre[l]
''',
    },
    {
        "id": "two_pointers", "name": "Two Pointers (converging)", "color": "#5fb37a",
        "triggers": ["sorted array + pair/triplet", "palindrome check", "maximise area between two lines", "in-place from both ends"],
        "fill": ["What makes you move left vs right?", "What do you record at each step?", "How do you skip duplicates?"],
        "skeleton": '''
l, r = 0, len(nums) - 1
while l < r:
    cur = f(nums[l], nums[r])
    if cur == target:
        record / return
    elif cur < target:         # need bigger
        l += 1
    else:                      # need smaller
        r -= 1
''',
    },
    {
        "id": "sliding_window", "name": "Sliding Window (variable)", "color": "#4aa3a2",
        "triggers": ["longest/shortest contiguous substring/subarray", "'at most k' distinct/replacements", "contains all chars of t"],
        "fill": ["What state does the window track? (count map, set, sum)", "When is the window INVALID (shrink condition)?", "When do you update the answer?"],
        "skeleton": '''
count = {}
l = 0
best = 0
for r in range(len(s)):
    add s[r] to window state
    while window is invalid:   # shrink until valid
        remove s[l] from window state
        l += 1
    best = max(best, r - l + 1)
return best
''',
    },
    {
        "id": "stack", "name": "Stack (matching / evaluation)", "color": "#8e7cc3",
        "triggers": ["matching brackets", "evaluate expression / RPN", "undo / most recent first", "track min alongside values"],
        "fill": ["What do you push?", "What triggers a pop?", "What must be true at the end?"],
        "skeleton": '''
stack = []
for tok in tokens:
    if tok opens / is a value:
        stack.append(tok)
    else:
        if not stack: return False
        top = stack.pop()
        combine / check top with tok
return not stack   # or stack[-1]
''',
    },
    {
        "id": "mono_stack", "name": "Monotonic Stack", "color": "#a57cc3",
        "triggers": ["next greater/smaller element", "days until warmer", "largest rectangle", "span problems"],
        "fill": ["Increasing or decreasing stack?", "Store index or value?", "What do you compute when you pop?"],
        "skeleton": '''
res = [0] * n
stack = []                     # indices, values kept decreasing
for i, x in enumerate(nums):
    while stack and nums[stack[-1]] < x:
        j = stack.pop()
        res[j] = i - j         # answer for j resolved by i
    stack.append(i)
return res
''',
    },
    {
        "id": "binary_search", "name": "Binary Search (index or answer)", "color": "#3d8fd1",
        "triggers": ["sorted input", "O(log n) required", "rotated sorted array", "'minimum X such that feasible(X)'"],
        "fill": ["What is the search space (indices or answer values)?", "What is the condition that splits it?", "lo <= hi or lo < hi? Which side keeps mid?"],
        "skeleton": '''
lo, hi = 0, len(nums) - 1      # or answer range
while lo <= hi:
    mid = (lo + hi) // 2
    if nums[mid] == target:
        return mid
    elif nums[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1
return -1

# "binary search on answer"
lo, hi = min_ans, max_ans
while lo < hi:
    mid = (lo + hi) // 2
    if feasible(mid): hi = mid
    else: lo = mid + 1
return lo
''',
    },
    {
        "id": "linked_list", "name": "Linked List (dummy, reverse, fast/slow)", "color": "#c46b6b",
        "triggers": ["reverse / reorder list", "merge lists", "nth from end", "cycle / middle node"],
        "fill": ["Do you need a dummy head?", "Which pointers move, and in what order?", "What is the loop condition (cur, cur.next, fast and fast.next)?"],
        "skeleton": '''
# dummy head: build or edit a list with no special case for the first node
dummy = tail = ListNode()
while ...:
    tail.next = node           # attach
    tail = tail.next
return dummy.next

# reverse
prev, cur = None, head
while cur:
    nxt = cur.next             # save the rest before breaking the link
    cur.next = prev
    prev, cur = cur, nxt
return prev

# fast / slow: middle, nth from end, cycle
slow = fast = head
while fast and fast.next:
    slow, fast = slow.next, fast.next.next
''',
    },
    {
        "id": "tree_dfs", "name": "Tree DFS (return a value up)", "color": "#6b9e3d",
        "triggers": ["depth / height / diameter", "is balanced / same / valid", "path sums", "anything 'per subtree'"],
        "fill": ["What does dfs(node) RETURN to its parent?", "What is the base case for None?", "Is there a global answer updated along the way?"],
        "skeleton": '''
def dfs(node):
    if not node:
        return base
    left = dfs(node.left)
    right = dfs(node.right)
    # optionally update a global answer here
    return combine(node.val, left, right)
return dfs(root)
''',
    },
    {
        "id": "tree_bfs", "name": "BFS Level Order", "color": "#3da67a",
        "triggers": ["level by level", "right side view", "minimum depth", "shortest steps in unweighted graph"],
        "fill": ["What do you collect per level?", "What goes in the queue?"],
        "skeleton": '''
from collections import deque
q = deque([root]) if root else deque()
res = []
while q:
    level = []
    for _ in range(len(q)):    # freeze level size
        node = q.popleft()
        level.append(node.val)
        if node.left: q.append(node.left)
        if node.right: q.append(node.right)
    res.append(level)
return res
''',
    },
    {
        "id": "grid_graph", "name": "Grid DFS/BFS (flood fill)", "color": "#2f8f9d",
        "triggers": ["islands / regions in a grid", "spread over time (rotting)", "reach the border / ocean"],
        "fill": ["What starts a search?", "How do you mark visited (set or overwrite grid)?", "Single-source DFS or multi-source BFS?"],
        "skeleton": '''
ROWS, COLS = len(grid), len(grid[0])
def dfs(r, c):
    if r < 0 or c < 0 or r >= ROWS or c >= COLS or grid[r][c] != "1":
        return
    grid[r][c] = "#"           # mark visited
    for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
        dfs(r + dr, c + dc)

count = 0
for r in range(ROWS):
    for c in range(COLS):
        if grid[r][c] == "1":
            dfs(r, c)
            count += 1
return count
''',
    },
    {
        "id": "backtracking", "name": "Backtracking (choose / explore / undo)", "color": "#c98a2e",
        "triggers": ["all subsets / permutations / combinations", "'return all possible'", "word search in grid", "n-queens"],
        "fill": ["What is the state (path, start index, used set)?", "When is a path complete?", "What are the choices, and how do you avoid duplicates?"],
        "skeleton": '''
res = []
path = []
def backtrack(start):
    if done(path):
        res.append(path[:])    # COPY
        return
    for i in range(start, len(nums)):
        path.append(nums[i])   # choose
        backtrack(i + 1)       # explore
        path.pop()             # undo
backtrack(0)
return res
''',
    },
    {
        "id": "heap", "name": "Heap / Top-K", "color": "#d16b9e",
        "triggers": ["k largest / smallest / closest", "repeatedly take the max/min", "merge k sorted", "running median"],
        "fill": ["Min-heap or max-heap (negate)?", "What tuple goes in the heap?", "Keep heap size k?"],
        "skeleton": '''
import heapq
# top k: keep a heap of size k
heap = []
for x in nums:
    heapq.heappush(heap, x)    # min-heap; push -x for max
    if len(heap) > k:
        heapq.heappop(heap)    # drop the smallest
return heap[0]                 # kth largest

# always handle the smallest next (merge k lists, meetings, tasks)
heap = [(key, i, item) for i, item in enumerate(items)]   # i breaks ties
heapq.heapify(heap)                                       # O(n)
while heap:
    key, i, item = heapq.heappop(heap)
    ...                        # push whatever this item unlocks
''',
    },
    {
        "id": "topo_sort", "name": "Topological Sort (Kahn's BFS)", "color": "#7a8fd1",
        "triggers": ["prerequisites / dependencies", "course schedule", "build order", "detect cycle in directed graph"],
        "fill": ["Which direction do edges point?", "What do you output (order, bool, count)?"],
        "skeleton": '''
from collections import deque, defaultdict
adj = defaultdict(list)
indeg = [0] * n
for a, b in edges:             # b -> a
    adj[b].append(a)
    indeg[a] += 1
q = deque(i for i in range(n) if indeg[i] == 0)
order = []
while q:
    u = q.popleft()
    order.append(u)
    for v in adj[u]:
        indeg[v] -= 1
        if indeg[v] == 0:
            q.append(v)
return order if len(order) == n else []   # cycle if short
''',
    },
    {
        "id": "union_find", "name": "Union-Find", "color": "#9d6b3d",
        "triggers": ["connected components count", "redundant edge / cycle in undirected graph", "is graph a valid tree"],
        "fill": ["What happens when union finds same root?", "What do you count/return?"],
        "skeleton": '''
parent = list(range(n))
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path compression
        x = parent[x]
    return x
def union(a, b):
    ra, rb = find(a), find(b)
    if ra == rb:
        return False           # already connected
    parent[ra] = rb
    return True
''',
    },
    {
        "id": "shortest_path", "name": "Shortest Path (Dijkstra / BFS)", "color": "#5a6fd1",
        "triggers": ["weighted edges, min total cost", "network delay", "min effort / max-of-path", "cheapest with <= k stops (Bellman-Ford)"],
        "fill": ["What is the edge cost and the path cost (sum or max)?", "Can a node be popped twice (skip if stale)?"],
        "skeleton": '''
import heapq
dist = {}                      # finalised shortest distances
heap = [(0, src)]              # (distance so far, node)
while heap:
    d, u = heapq.heappop(heap)
    if u in dist:
        continue               # stale: already finalised with a smaller d
    dist[u] = d                # first pop = shortest (no negative edges)
    for v, w in adj[u]:
        if v not in dist:
            heapq.heappush(heap, (d + w, v))
return dist
''',
    },
    {
        "id": "matrix_math", "name": "Matrix / Math Simulation", "color": "#7f8c8d",
        "triggers": ["rotate / spiral a matrix", "digit manipulation", "in-place markers", "cycle detection on numbers"],
        "fill": ["What are the boundaries and how do they shrink?", "Can you do it in place with a transform (transpose + reverse)?"],
        "skeleton": '''
R, C = len(m), len(m[0])
# rotate 90° clockwise (square) = transpose, then reverse each row
for i in range(R):
    for j in range(i + 1, C):
        m[i][j], m[j][i] = m[j][i], m[i][j]
for row in m:
    row.reverse()

# spiral / layer by layer: four walls that close in
top, bottom, left, right = 0, R - 1, 0, C - 1
while top <= bottom and left <= right:
    for c in range(left, right + 1): visit(top, c)
    top += 1
    for r in range(top, bottom + 1): visit(r, right)
    right -= 1
    if top <= bottom:          # re-check: a single row is left
        for c in range(right, left - 1, -1): visit(bottom, c)
        bottom -= 1
    if left <= right:          # re-check: a single column is left
        for r in range(bottom, top - 1, -1): visit(r, left)
        left += 1
''',
    },
    {
        "id": "dp_1d", "name": "1D DP", "color": "#d1a03d",
        "triggers": ["count ways", "min/max cost to reach i", "can you reach / form X", "'rob' non-adjacent", "optimal over prefixes"],
        "fill": ["What does dp[i] mean in one sentence?", "Recurrence: dp[i] from which earlier states?", "Base case(s) and answer location?"],
        "skeleton": '''
# dp[i] = ____ for the first i items      <- say this in words before any code
dp = [0] * (n + 1)
dp[0] = base                   # the answer for nothing: 1 way, 0 cost, True
for i in range(1, n + 1):
    # transition: which earlier states can lead to i, and what does item i add?
    dp[i] = best(dp[i - 1] + skip_i, dp[i - 2] + take_i)
return dp[n]                   # or max(dp) if dp[i] means 'ending exactly at i'
# top-down is the same recurrence: def f(i), base case first, then @cache
''',
    },
    {
        "id": "dp_2d", "name": "2D DP (grid / two strings)", "color": "#c47a3d",
        "triggers": ["two strings: LCS / edit distance", "grid paths", "knapsack with count/amount"],
        "fill": ["What does dp[i][j] mean?", "Which neighbours does it depend on?", "Table size: (m+1)x(n+1) with empty-prefix row?"],
        "skeleton": '''
# dp[i][j] = ____ for a[:i] and b[:j]  (grid: for cell (i, j))   <- say it first
m, n = len(a), len(b)
dp = [[base] * (n + 1) for _ in range(m + 1)]
# row 0 and column 0: the answer when one side is empty
for i in range(1, m + 1):
    for j in range(1, n + 1):
        if a[i - 1] == b[j - 1]:                       # current items match
            dp[i][j] = dp[i - 1][j - 1] + gain         # diagonal: use both
        else:
            dp[i][j] = best(dp[i - 1][j], dp[i][j - 1]) + cost   # drop one side
return dp[m][n]
# grid problems: no match test, dp[i][j] comes from up and left
''',
    },
    {
        "id": "greedy", "name": "Greedy (best move now)", "color": "#b5b53d",
        "triggers": ["max subarray", "can you reach the end / fewest jumps", "sort, then take what fits", "locally best choice never hurts"],
        "fill": ["Why can't a different choice do better? Say it before coding.", "Sort first? By what (end, size, start)?", "What single value do you carry forward, and when do you reset it?"],
        "skeleton": '''
# before coding: why can't a different choice do better? (swap argument)
items.sort(key=...)            # often first: by end, by size, by start
state = start                  # the ONE thing you carry: farthest reach, fuel, current run
for x in items:
    if breaks_rule(state, x):  # the current run / part / plan can't take x
        count += 1             # react the cheapest way: restart, jump, new part
        state = fresh(x)       #   (or return False if nothing can fix it)
    else:
        state = take(state, x) # the locally best move, never undone
return answer
''',
    },
    {
        "id": "intervals", "name": "Intervals (sort + sweep)", "color": "#5f8fb3",
        "triggers": ["merge / insert intervals", "overlapping meetings", "min removals for no overlap"],
        "fill": ["Sort by start or by end?", "What counts as overlap (< or <=)?", "What do you do on overlap?"],
        "skeleton": '''
intervals.sort(key=lambda x: x[0])
res = [intervals[0]]
for s, e in intervals[1:]:
    if s <= res[-1][1]:        # overlap
        res[-1][1] = max(res[-1][1], e)
    else:
        res.append([s, e])
return res
''',
    },
    {
        "id": "trie", "name": "Trie", "color": "#6bc4b0",
        "triggers": ["prefix search", "autocomplete", "many words searched in a grid", "wildcard word search"],
        "fill": ["What does each node store (children, end flag, word)?", "Iterative walk or DFS (for wildcards)?"],
        "skeleton": '''
root = {}                      # each node: dict of char -> child node
def insert(word):
    node = root
    for ch in word:
        node = node.setdefault(ch, {})
    node['$'] = True           # a word ends here
def search(word, prefix=False):
    node = root
    for ch in word:
        if ch not in node:
            return False
        node = node[ch]
    return prefix or '$' in node   # a prefix only needs the path to exist
''',
    },
    {
        "id": "bit", "name": "Bit Manipulation", "color": "#8f8f8f",
        "triggers": ["every element appears twice except one", "missing number", "count set bits", "no + operator"],
        "fill": ["Which identity cancels things (x ^ x = 0)?", "Shift and mask, or n & (n-1)?"],
        "skeleton": '''
res = 0
for x in nums:
    res ^= x                   # pairs cancel: a ^ a = 0, a ^ 0 = a
return res

# the other tricks, each O(1)
count = 0
while n:
    n &= n - 1                 # clears the lowest set bit
    count += 1
low = x & -x                   # keeps only the lowest set bit
odd = x & 1                    # the last bit
x >>= 1                        # drops the last bit (halves)
x &= 0xFFFFFFFF                # wrap to 32 bits: Python ints never overflow
''',
    },
]
