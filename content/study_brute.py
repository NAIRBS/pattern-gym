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

# DP: plain recursion. Each one is the memo version minus the cache, so the repeated
# work is visible: add @cache and it becomes the top-down solution.

"min_cost_stairs": """def minCostClimbingStairs(cost):
    # cheapest cost to get past the top, starting at stair i
    def from_step(i):
        if i >= len(cost):
            return 0
        # same i solved many times
        return cost[i] + min(from_step(i + 1), from_step(i + 2))
    return min(from_step(0), from_step(1))""",

"house_robber": """def rob(nums):
    # most money from houses i..end
    def best(i):
        if i >= len(nums):
            return 0
        # rob house i and skip its neighbour, or skip house i
        # best(i + 2) is reached from both branches
        return max(nums[i] + best(i + 2), best(i + 1))
    return best(0)""",

"house_robber_ii": """def rob(nums):
    if len(nums) == 1:
        return nums[0]
    def best(arr, i):
        if i >= len(arr):
            return 0
        return max(arr[i] + best(arr, i + 2), best(arr, i + 1))
    # the first and last houses touch, so never take both: solve the row twice
    return max(best(nums[:-1], 0), best(nums[1:], 0))""",

"longest_palindrome": """def longestPalindrome(s):
    best = ''
    for i in range(len(s)):
        # every substring s[i..j]
        for j in range(i, len(s)):
            sub = s[i:j + 1]
            # O(n) check each time
            if sub == sub[::-1] and len(sub) > len(best):
                best = sub
    return best""",

"palindromic_substrings": """def countSubstrings(s):
    count = 0
    for i in range(len(s)):
        # every substring s[i..j]
        for j in range(i, len(s)):
            sub = s[i:j + 1]
            # re-checks the middle that a smaller substring already checked
            if sub == sub[::-1]:
                count += 1
    return count""",

"decode_ways": """def numDecodings(s):
    # ways to decode s[i:]
    def ways(i):
        if i == len(s):
            return 1
        if s[i] == '0':
            return 0
        total = ways(i + 1)                # take one digit
        if i + 1 < len(s) and s[i:i + 2] <= '26':
            # take two digits; ways(i + 2) is also reached via i + 1
            total += ways(i + 2)
        return total
    return ways(0)""",

"coin_change": """def coinChange(coins, amount):
    # fewest coins that make rem, or inf
    def fewest(rem):
        if rem == 0:
            return 0
        if rem < 0:
            return float('inf')
        # the same rem is reached by many coin orders
        return min(fewest(rem - c) + 1 for c in coins)
    res = fewest(amount)
    return res if res != float('inf') else -1""",

"max_product_subarray": """def maxProduct(nums):
    best = nums[0]
    for i in range(len(nums)):
        prod = 1
        # every subarray starting at i
        for j in range(i, len(nums)):
            prod *= nums[j]
            best = max(best, prod)
    return best""",

"word_break": """def wordBreak(s, wordDict):
    words = set(wordDict)
    # can s[i:] be split into words?
    def can(i):
        if i == len(s):
            return True
        for j in range(i + 1, len(s) + 1):
            # can(j) gets re-asked from every earlier split
            if s[i:j] in words and can(j):
                return True
        return False
    return can(0)""",

"lis": """def lengthOfLIS(nums):
    # longest increasing run from i, given the last value taken
    def longest(i, prev):
        if i == len(nums):
            return 0
        skip = longest(i + 1, prev)
        take = 1 + longest(i + 1, nums[i]) if nums[i] > prev else 0
        # take or skip each number: 2^n choices
        return max(skip, take)
    return longest(0, float('-inf'))""",

"partition_equal_subset": """def canPartition(nums):
    total = sum(nums)
    if total % 2:
        return False
    # can some of nums[i:] add up to target?
    def reach(i, target):
        if target == 0:
            return True
        if i == len(nums) or target < 0:
            return False
        # take it or leave it
        return reach(i + 1, target - nums[i]) or reach(i + 1, target)
    return reach(0, total // 2)""",

"lcs": """def longestCommonSubsequence(text1, text2):
    # LCS of text1[i:] and text2[j:]
    def lcs(i, j):
        if i == len(text1) or j == len(text2):
            return 0
        if text1[i] == text2[j]:
            return 1 + lcs(i + 1, j + 1)
        # drop a char from either string; both paths reach
        # lcs(i + 1, j + 1) again
        return max(lcs(i + 1, j), lcs(i, j + 1))
    return lcs(0, 0)""",

"stock_cooldown": """def maxProfit(prices):
    # most profit from day i on
    def best(i, holding):
        if i >= len(prices):
            return 0
        rest = best(i + 1, holding)
        if holding:
            # sell, then the cooldown day is skipped
            act = prices[i] + best(i + 2, False)
        else:
            act = -prices[i] + best(i + 1, True)   # buy
        # only (i, holding) matters, yet each pair is solved many times
        return max(rest, act)
    return best(0, False)""",

"coin_change_ii": """def change(amount, coins):
    # ways to make rem using coins[i:]
    def ways(i, rem):
        if rem == 0:
            return 1
        if rem < 0 or i == len(coins):
            return 0
        # use coin i again, or move past it for good
        # (so 1+2 and 2+1 are not both counted)
        return ways(i, rem - coins[i]) + ways(i + 1, rem)
    return ways(0, amount)""",

"target_sum": """def findTargetSumWays(nums, target):
    def ways(i, total):
        if i == len(nums):
            return 1 if total == target else 0
        # + or - for every number: 2^n sign patterns,
        # many of them sharing the same (i, total)
        return ways(i + 1, total + nums[i]) + ways(i + 1, total - nums[i])
    return ways(0, 0)""",

"interleaving_string": """def isInterleave(s1, s2, s3):
    if len(s1) + len(s2) != len(s3):
        return False
    # can s1[i:] and s2[j:] interleave into s3[i + j:]?
    def ok(i, j):
        if i == len(s1) and j == len(s2):
            return True
        k = i + j
        if i < len(s1) and s1[i] == s3[k] and ok(i + 1, j):
            return True
        if j < len(s2) and s2[j] == s3[k] and ok(i, j + 1):
            return True
        # (i, j) is revisited through different orders
        return False
    return ok(0, 0)""",

"longest_increasing_path": """def longestIncreasingPath(matrix):
    R, C = len(matrix), len(matrix[0])
    # longest path starting here, recomputed on every visit
    def dfs(r, c):
        best = 1
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + dfs(nr, nc))
        return best
    return max(dfs(r, c) for r in range(R) for c in range(C))""",

"distinct_subsequences": """def numDistinct(s, t):
    # ways to form t[j:] from s[i:]
    def ways(i, j):
        if j == len(t):
            return 1
        if i == len(s):
            return 0
        total = ways(i + 1, j)             # skip s[i]
        if s[i] == t[j]:
            total += ways(i + 1, j + 1)    # use s[i] for t[j]
        return total
    return ways(0, 0)""",

"edit_distance": """def minDistance(word1, word2):
    # edits to turn word1[i:] into word2[j:]
    def dist(i, j):
        if i == len(word1):
            return len(word2) - j          # insert the rest
        if j == len(word2):
            return len(word1) - i          # delete the rest
        if word1[i] == word2[j]:
            return dist(i + 1, j + 1)
        # three branches that overlap heavily
        return 1 + min(dist(i + 1, j),       # delete
                       dist(i, j + 1),       # insert
                       dist(i + 1, j + 1))   # replace
    return dist(0, 0)""",

"burst_balloons": """def maxCoins(nums):
    # try bursting each remaining balloon next
    def best(balloons):
        if not balloons:
            return 0
        top = 0
        for k in range(len(balloons)):
            left = balloons[k - 1] if k > 0 else 1
            right = balloons[k + 1] if k + 1 < len(balloons) else 1
            rest = balloons[:k] + balloons[k + 1:]
            # every order: n!
            top = max(top, left * balloons[k] * right + best(rest))
        return top
    return best(nums)""",

"regex_matching": """def isMatch(s, p):
    # does s[i:] match p[j:]?
    def match(i, j):
        if j == len(p):
            return i == len(s)
        first = i < len(s) and p[j] in (s[i], '.')
        if j + 1 < len(p) and p[j + 1] == '*':
            # skip 'x*' entirely, or use it for one char and stay on it
            return match(i, j + 2) or (first and match(i + 1, j))
        return first and match(i + 1, j + 1)
    return match(0, 0)""",
}
