"""Per-problem walkthrough data: (brute force + why it's slow, pseudocode plan in plain steps).

The plan is deliberately written as the pseudocode you'd say out loud before coding.
"""

WALK = {
# ── Arrays & Hashing ──
"contains_duplicate": ("Compare every pair i < j: O(n²).", [
  "make an empty set 'seen'", "for each x in nums:", "  if x is in seen -> return True", "  add x to seen", "return False"]),
"valid_anagram": ("Sort both strings and compare: O(n log n). Fine, but counting is O(n).", [
  "if lengths differ -> False", "count map: +1 for each char of s, -1 for each char of t", "return True if every count is 0"]),
"two_sum": ("For each i, scan every j > i for target - nums[i]: O(n²).", [
  "map 'seen' from value -> index", "for i, x in nums:", "  need = target - x", "  if need in seen -> return [seen[need], i]", "  seen[x] = i   (after the check)"]),
"group_anagrams": ("Compare every pair of words for anagram-ness: O(n²·k).", [
  "groups = map from key -> list of words", "for each word:", "  key = its 26-letter count, as a tuple", "  append word to groups[key]", "return all the lists in groups"]),
"top_k_frequent": ("Count, then sort all values by count: O(n log n).", [
  "count each value", "buckets[f] = values that appear exactly f times (f up to n)", "walk f from n down to 1:", "  add bucket values to the result", "  stop when the result has k values"]),
"product_except_self": ("For each i, multiply all other elements: O(n²).", [
  "res[i] starts as product of everything LEFT of i (running product, starts at 1)", "walk right to left with a second running product (starts at 1)", "multiply res[i] by the product of everything RIGHT of i", "return res"]),
"valid_sudoku": ("Check each row, each column and each box in three separate passes: still O(81), just more code.", [
  "one set 'seen'", "for every filled cell (r, c) with value v:", "  build 3 keys: (row r, v), (v, col c), (box r//3, c//3, v)", "  if any key already in seen -> False", "  add all 3 keys", "return True"]),
"encode_decode": ("Join with a delimiter like ',': breaks when a string contains it.", [
  "encode: for each string write len + '#' + string", "decode: i = 0", "while i < len(s):", "  j = position of the next '#' from i", "  n = int(s[i:j]); take the n chars after j", "  move i past them"]),
"longest_consecutive": ("Sort, then scan for runs: O(n log n), but O(n) is required.", [
  "put all numbers in a set", "for each x in the set:", "  only if x-1 is NOT in the set (x starts a run):", "    count up x+1, x+2... while in the set", "    update best", "return best"]),
# ── Two Pointers ──
"valid_palindrome": ("Build a cleaned, lowercased copy and compare with its reverse: O(n) extra space.", [
  "l at start, r at end", "while l < r:", "  move l right past non-alphanumerics; move r left likewise", "  if lowercase chars differ -> False", "  step both inward", "return True"]),
"two_sum_ii": ("Hash map works but ignores 'sorted' and uses O(n) space.", [
  "l = 0, r = last", "while l < r:", "  s = nums[l] + nums[r]", "  equal -> return [l+1, r+1]", "  too small -> l += 1; too big -> r -= 1"]),
"three_sum": ("Three nested loops plus a set to dedupe: O(n³).", [
  "sort nums", "for each i (skip if same value as previous i):", "  two pointers l = i+1, r = end looking for sum == -nums[i]", "  on a hit: record, move l, skip equal values of l", "  sum too small -> l++, too big -> r--"]),
"container_water": ("Try every pair of lines: O(n²).", [
  "l = 0, r = last, best = 0", "while l < r:", "  area = (r - l) * min(h[l], h[r]); update best", "  move the SHORTER side inward (the taller can't help)", "return best"]),
"trapping_rain": ("For each bar, scan left and right for the max walls: O(n²).", [
  "l, r at both ends; leftMax = rightMax = 0", "while l < r:", "  if h[l] < h[r]: update leftMax, add leftMax - h[l], l++", "  else: update rightMax, add rightMax - h[r], r--", "return water"]),
# ── Sliding Window ──
"best_time_stock": ("Try every buy day and every later sell day: O(n²).", [
  "lowest = first price, best = 0", "for each later price p:", "  best = max(best, p - lowest)", "  lowest = min(lowest, p)", "return best"]),
"longest_substring": ("Check every substring for duplicates: O(n³).", [
  "set 'window', l = 0", "for each r:", "  while s[r] is in window: remove s[l], l++", "  add s[r]", "  best = max(best, r - l + 1)"]),
"char_replacement": ("Try every substring and count replacements needed: O(n²·26).", [
  "count map for the window, l = 0, maxf = 0", "for each r: add s[r], update maxf", "  while (window length - maxf) > k: remove s[l], l++", "  best = max(best, window length)"]),
"permutation_in_string": ("Generate every permutation of s1 and search s2: O(n!·m).", [
  "need = counts of s1", "window = counts of the first len(s1) chars of s2", "if equal -> True", "slide: add the new right char, remove the char that left", "  if equal -> True", "return False"]),
"min_window": ("Check every substring for containing t: O(n²·k).", [
  "need = counts of t, missing = len(t)", "for each r: if need[s[r]] > 0, missing--; need[s[r]]--", "  while missing == 0 (window covers t):", "    record window if smallest", "    give back s[l]: need[s[l]]++; if it went positive, missing++", "    l++"]),
# ── Stack / Monotonic ──
"valid_parentheses": ("Repeatedly delete '()', '[]', '{}' pairs until nothing changes: O(n²).", [
  "map closer -> opener; empty stack", "for each char:", "  opener -> push", "  closer -> if stack empty or top isn't its opener: False; else pop", "return stack is empty"]),
"min_stack": ("getMin scans the whole stack: O(n).", [
  "two stacks: values and running minimums", "push: push val; push min(val, current min)", "pop: pop both", "top: values[-1]; getMin: mins[-1]"]),
"eval_rpn": ("No real brute force; just a stack.", [
  "empty stack", "for each token:", "  number -> push int", "  operator -> b = pop, a = pop, push (a op b)", "  division truncates toward zero: int(a / b)", "return the only value left"]),
"daily_temperatures": ("For each day scan forward for a warmer one: O(n²).", [
  "res all 0; stack of indices", "for each day i:", "  while stack top is colder than today:", "    j = pop; res[j] = i - j", "  push i", "return res"]),
"car_fleet": ("Simulate the cars moving step by step: slow and messy.", [
  "pair (position, speed), sort by position descending", "for each car: time = (target - pos) / speed", "  if time > time of the fleet ahead: it's a new fleet (push)", "  else it merges (do nothing)", "return number of fleets"]),
"largest_rectangle": ("For each bar, expand left and right while bars are >= it: O(n²).", [
  "stack of (start index, height), increasing heights", "for each bar i with height h:", "  start = i", "  while top height > h: pop it, area = height * (i - its start), start = its start", "  push (start, h)", "remaining bars extend to the end: area = height * (n - start)"]),
"sliding_window_max": ("Take max() of every window: O(n·k).", [
  "deque of indices, values decreasing front to back", "for each i:", "  pop from the back while those values < nums[i]", "  push i", "  drop the front if it left the window (index <= i - k)", "  once i >= k-1, the front is the window max"]),
# ── Binary Search ──
"binary_search": ("Linear scan: O(n).", [
  "lo = 0, hi = n - 1", "while lo <= hi:", "  mid = middle", "  equal -> return mid", "  smaller -> lo = mid + 1; bigger -> hi = mid - 1", "return -1"]),
"search_2d_matrix": ("Scan the whole matrix: O(m·n).", [
  "treat it as one sorted array of length R·C", "binary search over indices 0..R·C-1", "value at idx = matrix[idx // C][idx % C]", "return True on a hit, else False"]),
"koko": ("Try every speed from 1 upward: O(max·n).", [
  "search space: speeds 1..max(piles)", "hours(k) = sum of ceil(p / k)", "binary search for the smallest k with hours(k) <= h:", "  feasible -> hi = mid; not feasible -> lo = mid + 1", "return lo"]),
"find_min_rotated": ("Scan for the minimum: O(n).", [
  "lo = 0, hi = n - 1", "while lo < hi:", "  if nums[mid] > nums[hi]: the drop is to the right -> lo = mid + 1", "  else: minimum is at mid or left -> hi = mid", "return nums[lo]"]),
"search_rotated": ("Find the pivot, then binary search one half (fine) or scan: O(n).", [
  "standard binary search loop", "if nums[mid] == target -> done", "if the left half [lo..mid] is sorted:", "  target inside it -> go left, else go right", "else the right half is sorted:", "  target inside it -> go right, else go left"]),
"time_map": ("get scans all values for the key: O(n).", [
  "store per key a list of (timestamp, value) (already in time order)", "get: binary search for the last timestamp <= t", "  when arr[mid] time <= t: record its value, go right", "  else go left", "return recorded value or ''"]),
"median_two_sorted": ("Merge both arrays and take the middle: O(m + n).", [
  "make A the shorter array; half = (m + n) // 2", "binary search i = how many elements A puts in the left half; j = half - i", "valid split when A[i-1] <= B[j] and B[j-1] <= A[i] (use ±inf at edges)", "odd total -> min of the right sides; even -> average of max-left and min-right", "A[i-1] too big -> move left; else move right"]),
# ── Linked List ──
"reverse_list": ("Copy values into an array and rebuild: O(n) extra space.", [
  "prev = None, cur = head", "while cur:", "  save next", "  point cur back to prev", "  move prev and cur forward", "return prev"]),
"merge_two": ("Collect all values, sort, rebuild: O((m+n) log(m+n)).", [
  "dummy node, tail = dummy", "while both lists have nodes:", "  attach the smaller head to tail, advance that list", "  advance tail", "attach whatever list is left", "return dummy.next"]),
"reorder_list": ("Copy nodes into an array and relink from both ends: O(n) space.", [
  "find the middle with slow/fast pointers", "cut the list after the middle", "reverse the second half", "weave: first1, second1, first2, second2..."]),
"remove_nth": ("Count the length, then walk to length - n: two passes.", [
  "dummy before head; fast = slow = dummy", "move fast n + 1 steps ahead", "move both until fast is None", "slow is just before the target: slow.next = slow.next.next", "return dummy.next"]),
"copy_random_list": ("No real brute force; the trick is the old -> new map.", [
  "map old node -> new node, with None -> None", "pass 1: create a copy of every node", "pass 2: for each node set copy.next = map[old.next], copy.random = map[old.random]", "return map[head]"]),
"add_two_numbers": ("Convert lists to integers, add, convert back: breaks on fixed-size ints.", [
  "dummy head, carry = 0", "while l1 or l2 or carry:", "  total = carry + l1 digit + l2 digit (0 if missing)", "  carry, digit = divmod(total, 10)", "  append digit, advance l1 and l2"]),
"linked_list_cycle": ("Remember every visited node in a set: O(n) space.", [
  "slow = fast = head", "while fast and fast.next:", "  slow one step, fast two steps", "  if they are the same node -> True", "return False"]),
"find_duplicate": ("Sort or use a set: modifies input or uses O(n) space.", [
  "view i -> nums[i] as a linked list; a duplicate value = a cycle entrance", "phase 1: slow = nums[slow], fast = nums[nums[fast]] until they meet", "phase 2: start slow2 at 0, step both one at a time", "where they meet is the duplicate"]),
"lru_cache": ("Track a timestamp per key and scan for the oldest on eviction: O(n).", [
  "ordered map key -> value (most recent at the end)", "get: missing -> -1; else move key to the end, return value", "put: set value, move key to end", "  if size > capacity: remove the FIRST (least recent) key"]),
"merge_k_lists": ("Merge lists one by one into the result: O(k·N).", [
  "min-heap with (value, list index, node) for each list head", "dummy head", "while heap: pop smallest, attach it", "  if it has a next node, push that", "return dummy.next"]),
"reverse_k_group": ("Copy values to an array, reverse chunks, rebuild: O(n) space.", [
  "dummy before head; group_prev = dummy", "loop: find the k-th node after group_prev (stop if missing)", "reverse the k nodes, with the first node pointing to the node after the group", "connect group_prev to the new group head", "group_prev = the old first node (now last)"]),
# ── Trees ──
"invert_tree": ("No brute force; recursion is the natural solution.", [
  "if node is None: return None", "swap node.left and node.right (inverted versions)", "return node"]),
"max_depth": ("No brute force; recursion is the natural solution.", [
  "depth(None) = 0", "depth(node) = 1 + max(depth(left), depth(right))"]),
"diameter": ("For each node compute heights separately: O(n²).", [
  "dfs(node) returns the HEIGHT of node's subtree", "at each node: left height + right height = longest path through it -> update best", "return 1 + max(left, right)", "answer = best"]),
"balanced_tree": ("For each node compute both heights from scratch: O(n²).", [
  "dfs returns height, or -1 if the subtree is unbalanced", "if a child returned -1 or heights differ by > 1 -> return -1", "else return 1 + max", "balanced if dfs(root) != -1"]),
"same_tree": ("No brute force; recurse in lockstep.", [
  "both None -> True", "one None or values differ -> False", "return same(left, left) and same(right, right)"]),
"subtree": ("Serialise both trees and do a substring search (works but fiddly).", [
  "if root is None -> False", "if sameTree(root, sub) -> True", "else check root.left and root.right recursively"]),
"lca_bst": ("Find both root-to-node paths and compare them: O(h) space.", [
  "cur = root", "both values smaller than cur -> go left", "both larger -> go right", "otherwise they split here (or one IS cur) -> return cur"]),
"good_nodes": ("For each node, walk up to the root checking: O(n·h).", [
  "dfs(node, maxSoFar)", "good if node.val >= maxSoFar", "new max = max(maxSoFar, node.val)", "return good + dfs(left, new max) + dfs(right, new max)"]),
"validate_bst": ("Compare each node only with its children: WRONG (misses deep violations).", [
  "dfs(node, low, high): allowed open range", "None -> True", "if not low < val < high -> False", "left gets (low, val), right gets (val, high)"]),
"kth_smallest_bst": ("Collect all values in-order into a list, take [k-1]: O(n) space.", [
  "iterative in-order: go left as far as possible pushing nodes", "pop a node: that's the next smallest; k -= 1", "if k == 0 -> return its value", "move to its right child and repeat"]),
"build_tree": ("For each root, search for it in inorder linearly: O(n²).", [
  "map value -> index in inorder", "take values from preorder in order (iterator)", "build(lo, hi): if empty -> None", "  root = next preorder value; mid = its inorder index", "  left = build(lo, mid-1); right = build(mid+1, hi)"]),
"max_path_sum": ("Try every pair of nodes as path ends: O(n²).", [
  "dfs(node) returns the best path going DOWN from node (one side only)", "left = max(dfs(left), 0), right = max(dfs(right), 0)  (drop negative branches)", "candidate through node = val + left + right -> update best", "return val + max(left, right)"]),
"serialize_tree": ("No brute force; pick a traversal with null markers.", [
  "serialize: preorder, writing 'N' for None, joined by commas", "deserialize: iterator over the tokens", "build(): token 'N' -> None", "  else node = token; node.left = build(); node.right = build()"]),
"level_order": ("DFS with a depth parameter also works; BFS is the natural fit.", [
  "queue with root (if any)", "while queue:", "  level size = len(queue)", "  pop that many nodes, collect values, push their children", "  append the level"]),
"right_side_view": ("DFS right-first, recording the first node at each depth (also fine).", [
  "BFS level by level", "for each level: record the LAST node's value", "push children left then right"]),
"word_ladder": ("DFS over all transformation sequences: exponential.", [
  "word set; endWord missing -> 0", "BFS queue of (word, steps=1), visited set", "pop: if word == end -> return steps", "  for each position and each letter a-z: build neighbour", "  if in the set and unvisited: mark, push (neighbour, steps + 1)", "return 0"]),
# ── Tries ──
"implement_trie": ("Store words in a list and scan: O(n·L) per query.", [
  "root = empty dict", "insert: walk/create a child per char; mark the end", "search: walk; fail on a missing char; True only if the end mark exists", "startsWith: walk; True if you never fall off"]),
"word_dictionary": ("Compare the pattern against every stored word: O(n·L).", [
  "trie insert as usual", "search = dfs(node, i)", "  i == len -> is there an end mark?", "  '.' -> try every child", "  letter -> follow that child if it exists"]),
"word_search_ii": ("Run Word Search separately for every word: O(words·m·n·4^L).", [
  "build a trie of all words; store the word at its end node", "DFS from every cell, walking the trie alongside the board", "  char not in trie node -> stop", "  end node reached -> record word, remove it to avoid duplicates", "  mark cell, explore 4 neighbours, unmark"]),
# ── Heap ──
"kth_largest_array": ("Sort and index: O(n log n).", [
  "min-heap", "push each number; if size > k, pop the smallest", "the heap top is the k-th largest"]),
"last_stone": ("Sort every round: O(n² log n).", [
  "max-heap via negatives", "while 2+ stones: pop two largest", "  if different, push the difference", "return the remaining stone or 0"]),
"k_closest": ("Sort all points by distance: O(n log n).", [
  "max-heap of size k keyed by -(x² + y²)", "push each point; if size > k pop (removes the farthest)", "return the points left"]),
"meeting_rooms_ii": ("For each meeting count how many others overlap it: O(n²).", [
  "sort by start", "min-heap of end times (rooms in use)", "for each meeting: if the earliest end <= its start, reuse that room (pop)", "  push this meeting's end", "answer = heap size"]),
"kth_largest_stream": ("Sort everything on every add: O(n log n) per add.", [
  "keep a min-heap of the k largest values", "add: push; if size > k pop", "return heap top"]),
"task_scheduler": ("Simulate time slot by slot with a max-heap and cooldown queue (also accepted).", [
  "count tasks; maxF = highest count; nMax = how many tasks have maxF", "frame = (maxF - 1) * (n + 1) + nMax", "answer = max(len(tasks), frame)"]),
"design_twitter": ("Collect ALL tweets of everyone followed and sort: fine for small inputs.", [
  "post: append (time, id) to the user's list, time++", "follow/unfollow: set add / discard", "feed: gather the last 10 tweets of the user + followees", "  take the 10 most recent (heap / nlargest)"]),
"median_finder": ("Keep a sorted list and insert with bisect: O(n) per insert.", [
  "lo = max-heap (lower half), hi = min-heap (upper half)", "add: push into lo, then move lo's max to hi", "  if hi is bigger than lo, move hi's min back to lo", "median: lo top if lo is bigger, else average of both tops"]),
"merge_k_lists_dummy": ("", []),
# ── Backtracking ──
"subsets": ("Count 0..2^n-1 in binary and pick elements by bits (also valid).", [
  "res, path", "bt(start): record a copy of path", "  for i from start: choose nums[i], bt(i + 1), undo"]),
"combination_sum": ("Generate all multisets up to target: same idea, less structured.", [
  "bt(start, remaining)", "remaining == 0 -> record copy", "for i from start: skip if candidates[i] > remaining", "  choose it, bt(i, remaining - c) (i again: reuse allowed), undo"]),
"permutations": ("itertools.permutations (not allowed in interviews).", [
  "used[] flags, path", "if path is full -> record copy", "for every unused i: mark, choose, recurse, undo, unmark"]),
"subsets_ii": ("Generate all subsets and dedupe with a set of tuples: wasteful.", [
  "sort", "bt(start): record copy of path", "  for i from start: if i > start and nums[i] == nums[i-1] -> skip", "  choose, bt(i + 1), undo"]),
"combination_sum_ii": ("All subsets, keep those summing to target, dedupe: O(2^n) with waste.", [
  "sort", "bt(start, remaining): 0 -> record", "  for i from start: skip duplicates at this level (i > start and same as previous)", "  if c > remaining -> break (sorted)", "  choose, bt(i + 1, remaining - c), undo"]),
"generate_parentheses": ("Generate all 2^(2n) strings and filter valid ones.", [
  "bt(s, open, close)", "length 2n -> record", "if open < n -> add '('", "if close < open -> add ')'"]),
"word_search": ("No better approach in general; DFS with pruning.", [
  "for every cell: dfs(r, c, i=0)", "dfs: i == len(word) -> True", "  out of bounds or char mismatch -> False", "  mark cell, try 4 neighbours with i + 1, unmark", "return whether any start works"]),
"palindrome_partitioning": ("Try every split pattern (2^(n-1)), keep all-palindrome ones.", [
  "bt(i): if i == len(s) -> record copy", "for j from i+1 to len: piece = s[i:j]", "  if piece is a palindrome: choose, bt(j), undo"]),
"letter_combinations": ("Nested loops: but the number of loops depends on input length -> recursion.", [
  "empty input -> []", "bt(i, current string)", "i == len(digits) -> record", "for each letter of digits[i]: bt(i + 1, cur + letter)"]),
"n_queens": ("Try all n^n placements and check each board.", [
  "sets: cols, diag (r-c), anti (r+c)", "bt(row): row == n -> record the board", "for each col: if attacked -> skip", "  place: add to sets, set 'Q', bt(row + 1), remove, reset '.'"]),
# ── Graphs ──
"num_islands": ("Same idea; BFS or union-find also work.", [
  "for every cell: if it's land '1':", "  count++, flood-fill from it turning connected land to '0'", "flood: out of bounds or not '1' -> stop; mark; recurse 4 directions", "return count"]),
"clone_graph": ("No brute force; it's a traversal with a map.", [
  "map original -> clone", "dfs(n): if already cloned -> return clone", "  create clone, store in map FIRST", "  for each neighbour: append dfs(neighbour) to clone's neighbours", "  return clone"]),
"max_area_island": ("Same idea as islands, counting cells.", [
  "area(r, c): out of bounds or water -> 0", "  sink the cell, return 1 + area of 4 neighbours", "answer = max area over all cells"]),
"pacific_atlantic": ("From every cell, DFS downhill to see if both oceans are reachable: O((m·n)²).", [
  "two visited sets: pac, atl", "DFS UPHILL (neighbour >= current) from every top/left border cell into pac", "same from bottom/right border cells into atl", "answer = cells in both"]),
"surrounded_regions": ("For each 'O' region, check whether it touches the border: messy.", [
  "from every border 'O', flood-fill marking cells 'S' (safe)", "then every remaining 'O' -> 'X'", "every 'S' -> 'O'"]),
"rotting_oranges": ("Simulate minute by minute rescanning the grid: O((m·n)²).", [
  "queue ALL rotten oranges; count fresh", "while queue and fresh > 0:", "  process one whole level (one minute): rot fresh neighbours, fresh--, enqueue", "  minutes++", "return minutes if fresh == 0 else -1"]),
"walls_and_gates": ("BFS from every room to find the nearest gate: O((m·n)²).", [
  "queue ALL gates at once", "BFS: for each neighbour that is still INF:", "  set it to current distance + 1, enqueue", "(first visit = shortest distance)"]),
"course_schedule": ("DFS cycle detection with 3 colours (also valid).", [
  "graph b -> a and indegree counts", "queue all courses with indegree 0", "pop, count++, decrement neighbours, enqueue those reaching 0", "possible if count == numCourses"]),
"course_schedule_ii": ("Same as Course Schedule.", [
  "Kahn's algorithm as in Course Schedule", "append each popped course to 'order'", "return order if it has every course, else []"]),
"alien_dictionary": ("No brute force; build the graph then topo sort.", [
  "node for every letter", "for each adjacent pair of words: first differing letters x, y -> edge x -> y", "  if no difference and the first word is longer -> return ''", "topological sort (Kahn's)", "if not every letter is output -> '' (cycle)"]),
"graph_valid_tree": ("DFS checking connectivity and cycles (also valid).", [
  "edges must be exactly n - 1, else False", "union-find over edges", "  if an edge joins two nodes already connected -> False (cycle)", "return True"]),
"count_components": ("DFS from each unvisited node, count starts (also valid).", [
  "parent[i] = i; count = n", "for each edge: find both roots", "  different roots -> union them, count--", "return count"]),
"redundant_connection": ("Remove each edge and test if still a tree: O(n²).", [
  "union-find over nodes 1..n", "for each edge in order:", "  if both ends already share a root -> return this edge", "  else union them"]),
"reconstruct_itinerary": ("Backtracking DFS trying destinations in sorted order (works, slower).", [
  "adjacency lists sorted so pop() gives the smallest destination", "dfs(a): while a has unused tickets: dfs(next destination popped)", "  after all tickets from a are used: append a to route", "answer = route reversed"]),
"min_cost_connect": ("Kruskal: sort all n² edges + union-find (also fine).", [
  "Prim's: heap with (0, point 0), visited set", "pop cheapest; skip if visited", "add its cost, mark visited", "push distances from it to every unvisited point", "until all points visited"]),
"network_delay": ("Bellman-Ford: O(V·E).", [
  "adjacency list", "Dijkstra from k with a min-heap of (time, node)", "first pop of a node = its shortest time", "if all n nodes reached -> max time, else -1"]),
"swim_rising_water": ("Binary search the time t and BFS to test reachability: O(n² log n), also fine.", [
  "min-heap of (max height on path, r, c), start at (grid[0][0], 0, 0)", "pop the lowest; if it's the corner -> return its value", "push unvisited neighbours with max(current, neighbour height)"]),
"cheapest_flights": ("DFS over all routes with up to k stops: exponential.", [
  "prices: inf everywhere, 0 at src", "repeat k + 1 times:", "  tmp = copy of prices", "  for each flight u->v: tmp[v] = min(tmp[v], prices[u] + w)", "  prices = tmp", "return prices[dst] or -1"]),
# ── 1D DP ──
"climbing_stairs": ("Plain recursion ways(n-1) + ways(n-2): O(2^n).", [
  "ways(0) = ways(1) = 1", "for each next step: new = previous + one before", "keep only the last two values"]),
"min_cost_stairs": ("Recursion trying 1 or 2 steps from each stair: O(2^n).", [
  "reach[0] = reach[1] = 0", "reach[i] = min(reach[i-1] + cost[i-1], reach[i-2] + cost[i-2])", "answer = reach[n] (keep two variables)"]),
"house_robber": ("Try every subset of non-adjacent houses: O(2^n).", [
  "prev = best up to two houses back, cur = best up to the last house", "for each house x: new = max(cur (skip x), prev + x (rob x))", "shift prev, cur", "return cur"]),
"house_robber_ii": ("Same, plus checking first/last conflicts: exponential.", [
  "one house -> return it", "answer = max(rob(houses without the first), rob(houses without the last))", "rob() is House Robber"]),
"longest_palindrome": ("Check every substring for palindrome: O(n³).", [
  "for each centre i: try (i, i) and (i, i+1)", "  expand while ends match and in bounds", "  if longer than best, best = s[l+1:r]", "return best"]),
"palindromic_substrings": ("Check every substring: O(n³).", [
  "for each centre (i, i) and (i, i+1):", "  while ends match: count++, expand outward", "return count"]),
"decode_ways": ("Recursion taking 1 or 2 digits each time: O(2^n).", [
  "dp[0] = 1 (empty)", "for i in 1..n:", "  if s[i-1] != '0': dp[i] += dp[i-1]", "  if s[i-2:i] is 10..26: dp[i] += dp[i-2]", "return dp[n]"]),
"coin_change": ("Recursion trying every coin at each step: exponential.", [
  "dp[0] = 0, others infinity", "for a in 1..amount: for each coin c <= a:", "  dp[a] = min(dp[a], dp[a - c] + 1)", "return dp[amount] or -1"]),
"max_product_subarray": ("Try every subarray: O(n²).", [
  "track curMax and curMin products ending here", "for each x: candidates = x, curMax·x, curMin·x", "  curMax = max of them, curMin = min of them", "  best = max(best, curMax)"]),
"word_break": ("Recursion trying every prefix: exponential without memo.", [
  "dp[0] = True", "for i in 1..n: for j < i:", "  if dp[j] and s[j:i] is a word -> dp[i] = True", "return dp[n]"]),
"lis": ("Try all subsequences: O(2^n).", [
  "dp[i] = LIS ending at i, starts at 1", "for each i, for each j < i with nums[j] < nums[i]:", "  dp[i] = max(dp[i], dp[j] + 1)", "return max(dp)"]),
"partition_equal_subset": ("Try all subsets for sum = total/2: O(2^n).", [
  "odd total -> False", "reachable = {0}", "for each x: reachable |= {r + x for r in reachable}", "return total // 2 in reachable"]),
# ── 2D DP ──
"unique_paths": ("Recursion paths(r, c) = paths(r-1, c) + paths(r, c-1): exponential.", [
  "grid of 1s (first row and column have exactly one path)", "for each other cell: dp = up + left", "return bottom-right"]),
"lcs": ("Try all subsequences of one string: O(2^n).", [
  "(m+1) x (n+1) table of 0", "for each i, j: chars match -> diagonal + 1", "  else max(up, left)", "return dp[m][n]"]),
"stock_cooldown": ("Recursion over buy/sell/rest decisions per day: exponential.", [
  "three states: hold, sold (today), rest", "each day: hold = max(hold, rest - p)", "  sold = hold + p", "  rest = max(rest, sold)", "(all from yesterday's values) answer = max(sold, rest)"]),
"coin_change_ii": ("Recursion choosing coins: exponential, and easy to double count.", [
  "dp[0] = 1", "for each coin (OUTER loop):", "  for a from coin to amount: dp[a] += dp[a - coin]", "return dp[amount]"]),
"target_sum": ("Try +/- for every number: O(2^n).", [
  "ways = {0: 1}", "for each x: new map: for each sum s with count c:", "  new[s + x] += c; new[s - x] += c", "return ways[target]"]),
"interleaving_string": ("Recursion choosing s1 or s2 for each char: exponential.", [
  "lengths must add up", "dp[i][j]: can s1[:i] + s2[:j] form s3[:i+j]", "dp[0][0] = True", "dp[i][j] = (dp[i-1][j] and s1[i-1] == s3[i+j-1]) or (dp[i][j-1] and s2[j-1] == s3[i+j-1])"]),
"longest_increasing_path": ("DFS from every cell without memo: exponential.", [
  "dfs(r, c) = 1 + max dfs of strictly larger neighbours (memoised)", "no visited set needed (strictly increasing can't loop)", "answer = max dfs over all cells"]),
"distinct_subsequences": ("Generate all subsequences of s: O(2^n).", [
  "dp[i][0] = 1 for all i", "dp[i][j] = dp[i-1][j] (skip s[i-1])", "  + dp[i-1][j-1] if s[i-1] == t[j-1] (use it)", "return dp[m][n]"]),
"edit_distance": ("Recursion trying insert/delete/replace: exponential.", [
  "dp[i][0] = i, dp[0][j] = j", "match -> diagonal", "else 1 + min(up (delete), left (insert), diagonal (replace))", "return dp[m][n]"]),
"burst_balloons": ("Try every burst order: O(n!).", [
  "pad with 1 on both ends", "dp[l][r] = best for bursting everything strictly between l and r", "for each gap length, each l, r: try each k as the LAST to burst:", "  dp[l][k] + vals[l]·vals[k]·vals[r] + dp[k][r]", "return dp[0][n-1]"]),
"regex_matching": ("Recursion branching on '*': exponential without memo.", [
  "dp[0][0] = True; row 0: 'x*' can match empty -> dp[0][j] = dp[0][j-2]", "for each i, j:", "  p[j-1] == '*': zero copies dp[i][j-2], or one more copy if p[j-2] matches s[i-1]: dp[i-1][j]", "  else: chars match (or '.') and dp[i-1][j-1]", "return dp[m][n]"]),
# ── Greedy ──
"max_subarray": ("Try every subarray: O(n²).", [
  "cur = best = first value", "for each next x: cur = max(x, cur + x)", "  best = max(best, cur)", "return best"]),
"jump_game": ("DFS/DP over every reachable index: O(n²).", [
  "goal = last index", "walk i from right to left:", "  if i + nums[i] >= goal: goal = i", "return goal == 0"]),
"jump_game_ii": ("DP min jumps to each index: O(n²).", [
  "jumps = 0, end = 0 (edge of current jump's reach), far = 0", "for i up to n-2: far = max(far, i + nums[i])", "  if i == end: jumps++, end = far", "return jumps"]),
"gas_station": ("Try every start and simulate the loop: O(n²).", [
  "if total gas < total cost -> -1", "tank = 0, start = 0", "for each i: tank += gas[i] - cost[i]", "  if tank < 0: start = i + 1, tank = 0", "return start"]),
"hand_of_straights": ("Repeatedly sort and remove groups: O(n² log n).", [
  "length must divide by groupSize", "count each card", "for each value x in sorted order with n copies left:", "  need n copies of x..x+groupSize-1; fail if short; subtract n", "return True"]),
"merge_triplets": ("Try all subsets of triplets: O(2^n).", [
  "ignore triplets with any value above target", "for the rest: note which positions equal the target", "True if all 3 positions were matched"]),
"partition_labels": ("For each cut position check letter overlap: O(n²).", [
  "last index of each letter", "sweep: end = max(end, last[c])", "  when i == end: record size, next part starts at i + 1"]),
"valid_parenthesis_string": ("Try all 3 meanings of every '*': O(3^n).", [
  "lo, hi = min and max possible open count", "'(' -> both +1; ')' -> both -1; '*' -> lo-1, hi+1", "hi < 0 -> False; clamp lo at 0", "valid if lo == 0 at the end"]),
# ── Intervals ──
"insert_interval": ("Append, sort, then Merge Intervals: O(n log n).", [
  "for each interval:", "  ends before new starts -> keep it", "  starts after new ends -> output new + this + the rest; done", "  otherwise overlap -> new = (min starts, max ends)", "if never placed, append new at the end"]),
"merge_intervals": ("Compare every pair and merge until stable: O(n²) or worse.", [
  "sort by start", "for each interval: if it overlaps the last merged one -> extend end with max", "  else append it", "return merged"]),
"non_overlapping": ("Try removing every subset: O(2^n).", [
  "sort by END", "end = -infinity, removed = 0", "for each: start >= end -> keep it, end = its end", "  else remove it (removed++)"]),
"meeting_rooms": ("Compare every pair: O(n²).", [
  "sort by start", "if any meeting starts before the previous ends -> False", "return True"]),
"min_interval_query": ("For each query scan all intervals: O(n·q).", [
  "sort intervals; process queries in sorted order", "push intervals with start <= q into a heap of (size, end)", "pop heap entries whose end < q", "answer for q = heap top size or -1", "return answers in the original query order"]),
# ── Math & Geometry ──
"rotate_image": ("Copy into a new matrix at rotated positions: O(n²) space.", [
  "transpose: swap m[i][j] with m[j][i] for j > i", "reverse every row"]),
"spiral_matrix": ("Simulate with direction changes and a visited grid (also fine).", [
  "top, bottom, left, right walls", "while walls valid: go right along top, top++", "  go down the right wall, right--", "  if top <= bottom: go left along bottom, bottom--", "  if left <= right: go up the left wall, left++"]),
"set_matrix_zeroes": ("Record zero rows and columns in two sets: O(m + n) space.", [
  "remember if row 0 has a zero", "for rows 1+: a zero at (r, c) marks matrix[0][c] and matrix[r][0]", "for rows 1+, columns right to left: zero the cell if its row or column is marked", "finally zero row 0 if it had a zero"]),
"happy_number": ("No brute force; detect the loop.", [
  "seen set", "while n != 1 and n not seen: add n, n = sum of squared digits", "return n == 1"]),
"plus_one": ("Convert to int, add 1, convert back (fails in fixed-width languages).", [
  "from the last digit: if < 9 -> add 1, return", "  else set it to 0 and continue left", "all were 9 -> prepend 1"]),
"pow_x_n": ("Multiply x n times: O(n).", [
  "negative n -> x = 1/x, n = -n", "result = 1", "while n: if lowest bit set -> result *= x", "  x *= x, n >>= 1"]),
"multiply_strings": ("Convert to int (not allowed).", [
  "result array of len1 + len2 zeros", "for i, j from the right: add digit product at i+j+1", "  carry: res[i+j] += res[i+j+1] // 10, keep res[i+j+1] % 10", "join, strip leading zeros, '0' if empty"]),
"detect_squares": ("For each query try every pair of stored points: O(n²).", [
  "count map of points", "count(x, y): for each stored point (px, py) that is a diagonal (|dx| == |dy| != 0):", "  add cnt[px,py] · cnt[x,py] · cnt[px,y]"]),
"reverse_integer": ("Reverse the string: works in Python, but show the digit math.", [
  "remember the sign; work on |x|", "pop the last digit with divmod, push it onto result", "re-apply sign", "outside 32-bit range -> 0"]),
# ── Bit Manipulation ──
"single_number": ("Count with a hash map: O(n) space.", [
  "res = 0", "XOR every number into res (pairs cancel)", "return res"]),
"hamming_weight": ("Check all 32 bits with a shift and mask (also fine).", [
  "while n: n &= n - 1 (drops one set bit), count++", "return count"]),
"counting_bits": ("Count bits for every number separately: O(n log n).", [
  "dp[0] = 0", "dp[i] = dp[i >> 1] + (i & 1)"]),
"reverse_bits": ("Convert to a 32-char binary string and reverse it (also fine).", [
  "repeat 32 times: res = (res << 1) | (n & 1); n >>= 1", "return res"]),
"missing_number": ("Sort and scan, or use a set: O(n log n) / O(n) space.", [
  "res = n", "for each index i and value x: res ^= i ^ x", "return res   (or n(n+1)/2 - sum)"]),
"sum_two_integers": ("No brute force; this is bit arithmetic.", [
  "while there is a carry (b, masked to 32 bits):", "  a, b = a XOR b (sum without carry), (a AND b) << 1 (carry)", "if it overflowed, mask a to 32 bits"]),
}
WALK.pop("merge_k_lists_dummy", None)
