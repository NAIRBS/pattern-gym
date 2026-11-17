"""Naive brute-force solutions for each pattern's first (worked-example) problem.

The Study walkthrough shows these BEFORE the real solution, so the learner sees the slow, obvious
version, finds the repeated work, and watches the pattern remove it. Each one is correct (validate.py
runs it against the same tests) but slow: that is the point.
"""

BRUTE = {
"contains_duplicate": """def containsDuplicate(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):   # compare every pair
            if nums[i] == nums[j]:
                return True
    return False""",

"valid_palindrome": """def isPalindrome(s):
    cleaned = ''.join(ch.lower() for ch in s if ch.isalnum())   # extra copy of the string
    return cleaned == cleaned[::-1]                            # and another reversed copy""",

"best_time_stock": """def maxProfit(prices):
    best = 0
    for buy in range(len(prices)):
        for sell in range(buy + 1, len(prices)):   # try every later sell day
            best = max(best, prices[sell] - prices[buy])
    return best""",

"binary_search": """def search(nums, target):
    for i, x in enumerate(nums):   # look at every element, ignoring that nums is sorted
        if x == target:
            return i
    return -1""",

"invert_tree": """def invertTree(root):
    # Build a brand-new mirrored copy instead of swapping in place: same O(n) time, O(n) extra nodes.
    if not root:
        return None
    copy = TreeNode(root.val)
    copy.left = invertTree(root.right)
    copy.right = invertTree(root.left)
    return copy""",

"num_islands": """def numIslands(grid):
    R, C = len(grid), len(grid[0])
    def component(r0, c0):                 # flood fill from scratch, remembering nothing between calls
        seen, stack = {(r0, c0)}, [(r0, c0)]
        while stack:
            r, c = stack.pop()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == '1' and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    stack.append((nr, nc))
        return seen
    count = 0
    for r in range(R):
        for c in range(C):
            # count a cell only if it is the top-left cell of its own island
            if grid[r][c] == '1' and min(component(r, c)) == (r, c):
                count += 1
    return count""",

"climbing_stairs": """def climbStairs(n):
    if n <= 1:
        return 1
    return climbStairs(n - 1) + climbStairs(n - 2)   # recomputes the same n over and over: O(2^n)""",

"kth_largest_stream": """class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.nums = list(nums)
    def add(self, val):
        self.nums.append(val)
        return sorted(self.nums)[-self.k]   # re-sort everything on every add""",

"meeting_rooms": """def canAttendMeetings(intervals):
    for i in range(len(intervals)):
        for j in range(i + 1, len(intervals)):   # check every pair of meetings
            s1, e1 = intervals[i]
            s2, e2 = intervals[j]
            if s1 < e2 and s2 < e1:              # they overlap
                return False
    return True""",

"valid_parentheses": """def isValid(s):
    prev = None
    while s != prev:                    # keep deleting innermost pairs until nothing changes
        prev = s
        s = s.replace('()', '').replace('[]', '').replace('{}', '')
    return s == ''""",

"reverse_list": """def reverseList(head):
    vals = []
    while head:                    # copy every value out...
        vals.append(head.val)
        head = head.next
    dummy = cur = ListNode()
    for v in reversed(vals):       # ...and build a whole new list backwards
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next""",

"generate_parentheses": """def generateParenthesis(n):
    from itertools import product
    def valid(s):
        bal = 0
        for ch in s:
            bal += 1 if ch == '(' else -1
            if bal < 0:
                return False
        return bal == 0
    # generate all 2^(2n) strings of brackets, keep the valid ones
    return [''.join(p) for p in product('()', repeat=2 * n) if valid(p)]""",

"level_order": """def levelOrder(root):
    def at_depth(node, d):                 # walk the whole tree again for every level
        if not node:
            return []
        if d == 0:
            return [node.val]
        return at_depth(node.left, d - 1) + at_depth(node.right, d - 1)
    res, d = [], 0
    while True:
        level = at_depth(root, d)
        if not level:
            return res
        res.append(level)
        d += 1""",

"daily_temperatures": """def dailyTemperatures(temperatures):
    n = len(temperatures)
    res = [0] * n
    for i in range(n):
        for j in range(i + 1, n):                      # scan forward from every day
            if temperatures[j] > temperatures[i]:
                res[i] = j - i
                break
    return res""",

"product_except_self": """def productExceptSelf(nums):
    res = []
    for i in range(len(nums)):
        p = 1
        for j in range(len(nums)):       # multiply everything except i, again for every i
            if j != i:
                p *= nums[j]
        res.append(p)
    return res""",

"max_subarray": """def maxSubArray(nums):
    best = nums[0]
    for i in range(len(nums)):
        total = 0
        for j in range(i, len(nums)):    # every subarray nums[i..j]
            total += nums[j]
            best = max(best, total)
    return best""",

"course_schedule": """def canFinish(numCourses, prerequisites):
    taken = set()
    progress = True
    while progress:                      # keep sweeping all courses until nothing new can be taken
        progress = False
        for c in range(numCourses):
            if c not in taken and all(b in taken for a, b in prerequisites if a == c):
                taken.add(c)
                progress = True
    return len(taken) == numCourses""",

"unique_paths": """def uniquePaths(m, n):
    if m == 1 or n == 1:
        return 1
    # every path either came from above or from the left; recomputes the same cells exponentially
    return uniquePaths(m - 1, n) + uniquePaths(m, n - 1)""",

"graph_valid_tree": """def validTree(n, edges):
    if len(edges) != n - 1:
        return False
    adj = {i: [] for i in range(n)}
    for a, b in edges:
        # before adding each edge, search the graph so far: is b already reachable from a?
        seen, stack = {a}, [a]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
        if b in seen:
            return False                 # adding it would close a cycle
        adj[a].append(b)
        adj[b].append(a)
    return True""",

"implement_trie": """class Trie:
    def __init__(self):
        self.words = []                  # just keep every word in a list
    def insert(self, word):
        self.words.append(word)
    def search(self, word):
        return word in self.words        # scans every word
    def startsWith(self, prefix):
        return any(w.startswith(prefix) for w in self.words)   # scans every word again""",

"min_cost_connect": """def minCostConnectPoints(points):
    n = len(points)
    in_tree = {0}
    total = 0
    while len(in_tree) < n:
        best = None
        for i in in_tree:                # try every (inside, outside) pair each round: O(n^3)
            for j in range(n):
                if j not in in_tree:
                    d = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1])
                    if best is None or d < best[0]:
                        best = (d, j)
        total += best[0]
        in_tree.add(best[1])
    return total""",

"single_number": """def singleNumber(nums):
    for x in nums:
        if nums.count(x) == 1:           # count scans the whole list for every element
            return x""",

"happy_number": """def isHappy(n):
    seen = []                            # a list: every membership check scans it
    while n != 1 and n not in seen:
        seen.append(n)
        n = sum(int(d) ** 2 for d in str(n))
    return n == 1""",
}
