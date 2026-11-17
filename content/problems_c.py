"""NeetCode 150 part C: remaining 1D/2D DP, Greedy, Intervals, Math & Geometry, Bit Manipulation."""
from .problems import P, F, D

PROBLEMS_C = [
P("min_cost_stairs", 100, "Min Cost Climbing Stairs", "dp_1d", "Easy",
  "cost[i] is paid when you step on stair i. Start at step 0 or 1, climb 1 or 2 at a time. Return the min cost to reach the top (past the last step).",
  "reach(i) = min(reach(i-1) + cost[i-1], reach(i-2) + cost[i-2]); reach(0) = reach(1) = 0. Only two values needed.",
  "The top is index len(cost), one past the last stair.",
  "O(n)", "O(1)",
  ["Can I start on step 0 or 1 for free?"],
  ["two stairs", "zero costs", "alternating cheap/expensive"],
  '''
def minCostClimbingStairs(cost):
    a, b = 0, 0  # <<
    for i in range(2, len(cost) + 1):
        a, b = b, min(b + cost[i - 1], a + cost[i - 2])  # <<
    return b
''',
  F("minCostClimbingStairs", [([[10,15,20]], 15), ([[1,100,1,1,1,100,1,1,100,1]], 6), ([[0,0]], 0)])),

P("longest_palindrome", 103, "Longest Palindromic Substring", "dp_1d", "Medium",
  "Return the longest palindromic substring of s (any one if tied).",
  "Every palindrome has a centre: a character (odd) or a gap (even). Expand outward from all 2n - 1 centres while the ends match.",
  "After expanding, the palindrome is s[l+1:r] (the loop overshoots by one on each side).",
  "O(n²)", "O(1)",
  ["Return any one if several tie?"],
  ["single character", "even-length answer 'cbbd'", "whole string"],
  '''
def longestPalindrome(s):
    best = ''
    for i in range(len(s)):
        for l, r in ((i, i), (i, i + 1)):  # <<
            while l >= 0 and r < len(s) and s[l] == s[r]:  # <<
                l, r = l - 1, r + 1
            if r - l - 1 > len(best):
                best = s[l + 1:r]  # <<
    return best
''',
  F("longestPalindrome", [(["babad"], 3), (["cbbd"], 2), (["a"], 1), (["racecar"], 7)],
    harness='''
def harness(fn, args):
    s = args[0]
    res = fn(s)
    if not isinstance(res, str) or res != res[::-1] or res not in s:
        return "not a palindromic substring: " + repr(res)
    return len(res)
''')),

P("palindromic_substrings", 104, "Palindromic Substrings", "dp_1d", "Medium",
  "Count the palindromic substrings of s (different positions count separately).",
  "Same expand-around-centre as Longest Palindromic Substring, but count every successful expansion.",
  "Remember the even centres (i, i + 1): 'aa' has three palindromes.",
  "O(n²)", "O(1)",
  [],
  ["all same letters", "no repeats", "single char"],
  '''
def countSubstrings(s):
    count = 0
    for i in range(len(s)):
        for l, r in ((i, i), (i, i + 1)):
            while l >= 0 and r < len(s) and s[l] == s[r]:  # <<
                count += 1  # <<
                l, r = l - 1, r + 1
    return count
''',
  F("countSubstrings", [(["abc"], 3), (["aaa"], 6), (["a"], 1)])),

P("max_product_subarray", 107, "Maximum Product Subarray", "dp_1d", "Medium",
  "Return the largest product of a contiguous non-empty subarray.",
  "Track BOTH the max and min product ending here: a negative number turns the smallest product into the largest.",
  "Candidates are x, max*x, min*x, computed from the OLD max/min (tuple assignment). Zeros reset naturally because x itself is a candidate.",
  "O(n)", "O(1)",
  ["Non-empty subarray?", "Can values be zero or negative?"],
  ["zero in the middle", "two negatives", "single negative"],
  '''
def maxProduct(nums):
    best = cur_max = cur_min = nums[0]
    for x in nums[1:]:
        cands = (x, cur_max * x, cur_min * x)  # <<
        cur_max, cur_min = max(cands), min(cands)  # <<
        best = max(best, cur_max)  # <<
    return best
''',
  F("maxProduct", [([[2,3,-2,4]], 6), ([[-2,0,-1]], 0), ([[-2,3,-4]], 24), ([[-2]], -2)])),

P("partition_equal_subset", 110, "Partition Equal Subset Sum", "dp_1d", "Medium",
  "Can nums be split into two subsets with equal sums?",
  "Equivalent to: is there a subset summing to total / 2? Track the set of reachable sums, adding each number once.",
  "Odd total -> False immediately. Build the new sums from the OLD set (no reusing a number).",
  "O(n·sum)", "O(sum)",
  ["Positive integers only?"],
  ["odd total", "single element", "one element equals half"],
  '''
def canPartition(nums):
    total = sum(nums)
    if total % 2:
        return False  # <<
    reach = {0}
    for x in nums:
        reach |= {r + x for r in reach}  # <<
    return total // 2 in reach  # <<
''',
  F("canPartition", [([[1,5,11,5]], True), ([[1,2,3,5]], False), ([[1,1]], True), ([[2]], False)])),

P("stock_cooldown", 113, "Best Time to Buy and Sell Stock with Cooldown", "dp_2d", "Medium",
  "Unlimited transactions, but after selling you must rest one day before buying again. Return max profit.",
  "State machine per day: hold (own a share), sold (sold today), rest (no share, free to buy). hold = max(hold, rest - p); sold = hold + p; rest = max(rest, sold).",
  "Compute all three from YESTERDAY's values (one tuple assignment). Buying comes from rest, never from sold.",
  "O(n)", "O(1)",
  [],
  ["one day", "strictly decreasing", "cooldown forces skipping a trade"],
  '''
def maxProfit(prices):
    hold, sold, rest = float('-inf'), 0, 0
    for p in prices:
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)  # <<
    return max(sold, rest)  # <<
''',
  F("maxProfit", [([[1,2,3,0,2]], 3), ([[1]], 0), ([[2,1,4]], 3)])),

P("target_sum", 115, "Target Sum", "dp_2d", "Medium",
  "Put + or - before every number. Count the expressions that evaluate to target.",
  "DP over (index, running sum): keep a map sum -> number of ways after each number.",
  "Zeros double the count (+0 and -0 are different expressions).",
  "O(n·sum)", "O(sum)",
  [],
  ["zeros in the input", "unreachable target", "single number"],
  '''
def findTargetSumWays(nums, target):
    ways = {0: 1}  # <<
    for x in nums:
        nxt = defaultdict(int)
        for s, c in ways.items():
            nxt[s + x] += c  # <<
            nxt[s - x] += c  # <<
        ways = nxt
    return ways.get(target, 0)
''',
  F("findTargetSumWays", [([[1,1,1,1,1], 3], 5), ([[1], 1], 1), ([[1], 2], 0), ([[0,0], 0], 4)])),

P("interleaving_string", 116, "Interleaving String", "dp_2d", "Medium",
  "Is s3 formed by interleaving s1 and s2 (keeping each one's order)?",
  "dp[i][j] = can s1[:i] and s2[:j] form s3[:i+j]? True if coming from dp[i-1][j] with s1[i-1] matching, or from dp[i][j-1] with s2[j-1] matching.",
  "Length check first. The next char of s3 is at index i + j - 1.",
  "O(m·n)", "O(m·n)",
  [],
  ["all empty", "lengths don't add up", "greedy choice would fail"],
  '''
def isInterleave(s1, s2, s3):
    m, n = len(s1), len(s2)
    if m + n != len(s3):
        return False  # <<
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    for i in range(m + 1):
        for j in range(n + 1):
            if i > 0 and dp[i - 1][j] and s1[i - 1] == s3[i + j - 1]:  # <<
                dp[i][j] = True
            if j > 0 and dp[i][j - 1] and s2[j - 1] == s3[i + j - 1]:  # <<
                dp[i][j] = True
    return dp[m][n]
''',
  F("isInterleave", [(["aabcc","dbbca","aadbbcbcac"], True), (["aabcc","dbbca","aadbbbaccc"], False), (["","",""], True), (["a","","a"], True)])),

P("longest_increasing_path", 117, "Longest Increasing Path in a Matrix", "dp_2d", "Hard",
  "Return the length of the longest strictly increasing path (4-directional) in a matrix.",
  "DFS from each cell with memoisation: longest(r, c) = 1 + max over strictly larger neighbours. No visited set needed: strictly increasing paths can't loop.",
  "@cache (or a memo dict) is what turns exponential into O(m·n).",
  "O(m·n)", "O(m·n)",
  [],
  ["1 x 1", "all equal values -> 1", "snake-shaped path"],
  '''
def longestIncreasingPath(matrix):
    R, C = len(matrix), len(matrix[0])
    @cache
    def dfs(r, c):
        best = 1
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C and matrix[nr][nc] > matrix[r][c]:  # <<
                best = max(best, 1 + dfs(nr, nc))  # <<
        return best
    return max(dfs(r, c) for r in range(R) for c in range(C))  # <<
''',
  F("longestIncreasingPath", [([[[9,9,4],[6,6,8],[2,1,1]]], 4), ([[[3,4,5],[3,2,6],[2,2,1]]], 4), ([[[1]]], 1)])),

P("distinct_subsequences", 118, "Distinct Subsequences", "dp_2d", "Hard",
  "Count the distinct subsequences of s that equal t.",
  "dp[i][j] = ways s[:i] forms t[:j]. Always inherit dp[i-1][j] (skip s[i-1]); if the chars match, add dp[i-1][j-1] (use it).",
  "dp[i][0] = 1: the empty t is formed one way from any prefix.",
  "O(m·n)", "O(m·n)",
  [],
  ["t longer than s -> 0", "t empty -> 1", "repeated letters"],
  '''
def numDistinct(s, t):
    m, n = len(s), len(t)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = 1  # <<
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = dp[i - 1][j]  # <<
            if s[i - 1] == t[j - 1]:
                dp[i][j] += dp[i - 1][j - 1]  # <<
    return dp[m][n]
''',
  F("numDistinct", [(["rabbbit","rabbit"], 3), (["babgbag","bag"], 5), (["a","b"], 0)])),

P("burst_balloons", 120, "Burst Balloons", "dp_2d", "Hard",
  "Bursting balloon i earns nums[left] * nums[i] * nums[right] with its current neighbours. Return the max coins from bursting all.",
  "Interval DP: pad with 1s; dp[l][r] = best for bursting everything strictly between l and r. Choose k as the LAST balloon burst in (l, r): its neighbours are then exactly l and r.",
  "Thinking 'last' instead of 'first' is the whole trick: it makes the subproblems independent.",
  "O(n³)", "O(n²)",
  [],
  ["single balloon", "two balloons", "zeros"],
  '''
def maxCoins(nums):
    vals = [1] + nums + [1]  # <<
    n = len(vals)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n):
        for l in range(n - length):
            r = l + length
            for k in range(l + 1, r):
                dp[l][r] = max(dp[l][r], dp[l][k] + vals[l] * vals[k] * vals[r] + dp[k][r])  # <<
    return dp[0][n - 1]  # <<
''',
  F("maxCoins", [([[3,1,5,8]], 167), ([[1,5]], 10), ([[7]], 7)])),

P("regex_matching", 121, "Regular Expression Matching", "dp_2d", "Hard",
  "Implement matching of s against pattern p with '.' (any char) and '*' (zero or more of the previous element), covering the whole string.",
  "dp[i][j] = s[:i] matches p[:j]. For '*': either use zero copies (dp[i][j-2]) or, if the previous pattern char matches s[i-1], one more copy (dp[i-1][j]).",
  "Initialise row 0 for patterns like 'a*b*' that match the empty string.",
  "O(m·n)", "O(m·n)",
  ["Is '*' always preceded by a valid character?"],
  ["pattern '.*'", "'c*a*b' matching 'aab'", "empty string vs 'a*'"],
  '''
def isMatch(s, p):
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    for j in range(2, n + 1):
        if p[j - 1] == '*':
            dp[0][j] = dp[0][j - 2]  # <<
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == '*':
                match = p[j - 2] in (s[i - 1], '.')
                dp[i][j] = dp[i][j - 2] or (match and dp[i - 1][j])  # <<
            else:
                dp[i][j] = dp[i - 1][j - 1] and p[j - 1] in (s[i - 1], '.')  # <<
    return dp[m][n]
''',
  F("isMatch", [(["aa","a"], False), (["aa","a*"], True), (["ab",".*"], True), (["aab","c*a*b"], True), (["mississippi","mis*is*p*."], False)])),

P("hand_of_straights", 126, "Hand of Straights", "greedy", "Medium",
  "Can the cards be rearranged into groups of groupSize consecutive values?",
  "The smallest remaining card MUST start a group. Walk values in sorted order; if x has n copies left, consume n copies of x..x+groupSize-1.",
  "Check len(hand) % groupSize first. Fail as soon as any needed count is short.",
  "O(n log n)", "O(n)",
  [],
  ["length not divisible", "duplicates forming parallel runs", "gap in values"],
  '''
def isNStraightHand(hand, groupSize):
    if len(hand) % groupSize:
        return False
    count = Counter(hand)
    for x in sorted(count):
        n = count[x]
        if n:
            for y in range(x, x + groupSize):
                if count[y] < n:  # <<
                    return False
                count[y] -= n  # <<
    return True
''',
  F("isNStraightHand", [([[1,2,3,6,2,3,4,7,8], 3], True), ([[1,2,3,4,5], 4], False), ([[1,1,2,2,3,3], 3], True), ([[1,2,4], 3], False)])),

P("merge_triplets", 127, "Merge Triplets to Form Target Triplet", "greedy", "Medium",
  "Merging two triplets takes the element-wise max. Can some merge sequence produce exactly target?",
  "Ignore any triplet that exceeds target anywhere (it would poison the max). Among the rest, check each of the 3 coordinates is hit exactly by some triplet.",
  "You don't need to choose which ones to merge: merging all 'safe' triplets is optimal.",
  "O(n)", "O(1)",
  [],
  ["one triplet equals target", "a coordinate never reached", "only triplets that overshoot"],
  '''
def mergeTriplets(triplets, target):
    good = set()
    for t in triplets:
        if all(t[i] <= target[i] for i in range(3)):  # <<
            for i in range(3):
                if t[i] == target[i]:
                    good.add(i)  # <<
    return len(good) == 3  # <<
''',
  F("mergeTriplets", [([[[2,5,3],[1,8,4],[1,7,5]], [2,7,5]], True), ([[[3,4,5],[4,5,6]], [3,2,5]], False),
                      ([[[2,5,3],[2,3,4],[1,2,5],[5,2,3]], [5,5,5]], True)])),

P("partition_labels", 128, "Partition Labels", "greedy", "Medium",
  "Split s into as many parts as possible so each letter appears in at most one part. Return the part sizes.",
  "Record each letter's last index. Sweep, extending the current part's end to the max last-index seen; when i reaches end, cut.",
  "Sizes are end - start + 1; the next part starts at i + 1.",
  "O(n)", "O(1)",
  [],
  ["one letter repeated everywhere", "all distinct letters", "single character"],
  '''
def partitionLabels(s):
    last = {c: i for i, c in enumerate(s)}  # <<
    res = []
    start = end = 0
    for i, c in enumerate(s):
        end = max(end, last[c])  # <<
        if i == end:  # <<
            res.append(end - start + 1)
            start = i + 1
    return res
''',
  F("partitionLabels", [(["ababcbacadefegdehijhklij"], [9,7,8]), (["eccbbbbdec"], [10]), (["a"], [1]), (["abc"], [1,1,1])])),

P("valid_parenthesis_string", 129, "Valid Parenthesis String", "greedy", "Medium",
  "s has '(', ')' and '*' (which can be '(', ')' or empty). Is it valid?",
  "Track the RANGE [lo, hi] of possible open-bracket counts. '(' +1 both, ')' -1 both, '*' widens to lo-1..hi+1. hi < 0 means too many ')'. Valid if lo can be 0 at the end.",
  "Clamp lo at 0 every step (counts can't go negative).",
  "O(n)", "O(1)",
  [],
  ["only stars", "')(' with no stars", "star must act as ')'"],
  '''
def checkValidString(s):
    lo = hi = 0
    for ch in s:
        if ch == '(':
            lo, hi = lo + 1, hi + 1
        elif ch == ')':
            lo, hi = lo - 1, hi - 1
        else:
            lo, hi = lo - 1, hi + 1  # <<
        if hi < 0:
            return False  # <<
        lo = max(lo, 0)  # <<
    return lo == 0
''',
  F("checkValidString", [(["()"], True), (["(*)"], True), (["(*))"], True), ([")("], False), (["(("], False), (["*"], True)])),

P("meeting_rooms", 133, "Meeting Rooms", "intervals", "Easy",
  "Given meeting intervals, can one person attend all of them?",
  "Sort by start; any meeting starting before the previous one ends is a conflict.",
  "Back-to-back (end == next start) is fine, so the test is strictly s2 < e1.",
  "O(n log n)", "O(1)",
  ["Is end == start a conflict?"],
  ["no meetings", "back-to-back meetings", "unsorted input"],
  '''
def canAttendMeetings(intervals):
    intervals.sort(key=lambda x: x[0])  # <<
    for (s1, e1), (s2, e2) in zip(intervals, intervals[1:]):
        if s2 < e1:  # <<
            return False
    return True
''',
  F("canAttendMeetings", [([[[0,30],[5,10],[15,20]]], False), ([[[7,10],[2,4]]], True), ([[]], True), ([[[1,5],[5,8]]], True)])),

P("min_interval_query", 135, "Minimum Interval to Include Each Query", "intervals", "Hard",
  "For each query q, return the size of the smallest interval [l, r] with l <= q <= r, or -1.",
  "Process queries in sorted order. Push every interval that has started (l <= q) into a min-heap by size; pop ones that already ended (r < q). The heap top answers q.",
  "Answer in the ORIGINAL query order (map query -> answer).",
  "O((n + q) log n)", "O(n + q)",
  ["Inclusive interval bounds?"],
  ["query outside all intervals", "duplicate queries", "nested intervals"],
  '''
def minInterval(intervals, queries):
    intervals.sort()
    heap = []
    res = {}
    i = 0
    for q in sorted(queries):
        while i < len(intervals) and intervals[i][0] <= q:  # <<
            l, r = intervals[i]
            heapq.heappush(heap, (r - l + 1, r))
            i += 1
        while heap and heap[0][1] < q:  # <<
            heapq.heappop(heap)
        res[q] = heap[0][0] if heap else -1  # <<
    return [res[q] for q in queries]
''',
  F("minInterval", [([[[1,4],[2,4],[3,6],[4,4]], [2,3,4,5]], [3,3,1,4]), ([[[2,3],[2,5],[1,8],[20,25]], [2,19,5,22]], [2,-1,4,6])])),

P("rotate_image", 136, "Rotate Image", "matrix_math", "Medium",
  "Rotate an n x n matrix 90 degrees clockwise, in place.",
  "Clockwise rotation = transpose (swap across the main diagonal), then reverse each row.",
  "Transpose only the upper triangle (j > i), or you swap everything twice and undo it.",
  "O(n²)", "O(1)",
  ["In place?"],
  ["1 x 1", "2 x 2"],
  '''
def rotate(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):  # <<
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]  # <<
    for row in matrix:
        row.reverse()  # <<
''',
  F("rotate", [([[[1,2,3],[4,5,6],[7,8,9]]], [[7,4,1],[8,5,2],[9,6,3]]), ([[[1]]], [[1]]), ([[[1,2],[3,4]]], [[3,1],[4,2]])], inplace=0)),

P("spiral_matrix", 137, "Spiral Matrix", "matrix_math", "Medium",
  "Return all elements of an m x n matrix in clockwise spiral order.",
  "Four boundaries (top, bottom, left, right). Walk the top row, right column, bottom row, left column, shrinking the matching boundary after each.",
  "Re-check top <= bottom and left <= right before the bottom row and left column, or single rows/columns get repeated.",
  "O(m·n)", "O(1)",
  [],
  ["single row", "single column", "non-square"],
  '''
def spiralOrder(matrix):
    res = []
    top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            res.append(matrix[top][c])
        top += 1  # <<
        for r in range(top, bottom + 1):
            res.append(matrix[r][right])
        right -= 1
        if top <= bottom:  # <<
            for c in range(right, left - 1, -1):
                res.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:  # <<
            for r in range(bottom, top - 1, -1):
                res.append(matrix[r][left])
            left += 1
    return res
''',
  F("spiralOrder", [([[[1,2,3],[4,5,6],[7,8,9]]], [1,2,3,6,9,8,7,4,5]), ([[[1,2,3,4],[5,6,7,8],[9,10,11,12]]], [1,2,3,4,8,12,11,10,9,5,6,7]),
                    ([[[1],[2],[3]]], [1,2,3]), ([[[1,2,3]]], [1,2,3])])),

P("set_matrix_zeroes", 138, "Set Matrix Zeroes", "matrix_math", "Medium",
  "If a cell is 0, set its whole row and column to 0, in place, with O(1) extra space.",
  "Use row 0 and column 0 as marker arrays: mark matrix[0][c] and matrix[r][0] for each zero. Remember separately whether row 0 itself had a zero.",
  "Record the first-row flag BEFORE writing markers into it, and zero row 0 last. Sweep columns RIGHT to LEFT so column 0 (the marker column) is overwritten last.",
  "O(m·n)", "O(1)",
  ["In place, constant space?"],
  ["zero in the first row", "zero in the first column", "single row"],
  '''
def setZeroes(matrix):
    R, C = len(matrix), len(matrix[0])
    first_row_zero = any(matrix[0][c] == 0 for c in range(C))  # <<
    for r in range(1, R):
        for c in range(C):
            if matrix[r][c] == 0:
                matrix[0][c] = 0  # <<
                matrix[r][0] = 0
    for r in range(1, R):
        for c in range(C - 1, -1, -1):  # <<
            if matrix[0][c] == 0 or matrix[r][0] == 0:  # <<
                matrix[r][c] = 0
    if first_row_zero:
        for c in range(C):
            matrix[0][c] = 0
''',
  F("setZeroes", [([[[1,1,1],[1,0,1],[1,1,1]]], [[1,0,1],[0,0,0],[1,0,1]]), ([[[0,1,2,0],[3,4,5,2],[1,3,1,5]]], [[0,0,0,0],[0,4,5,0],[0,3,1,0]]),
                  ([[[1,0]]], [[0,0]]), ([[[1],[0]]], [[0],[0]])], inplace=0)),

P("happy_number", 139, "Happy Number", "matrix_math", "Easy",
  "Repeatedly replace n by the sum of the squares of its digits. Return True if it reaches 1, False if it loops forever.",
  "It's cycle detection: remember seen values (or use fast/slow pointers). Hitting a repeat before 1 means it never ends.",
  "Check both stop conditions in the loop: n == 1 or n already seen.",
  "O(log n)", "O(log n)",
  [],
  ["n = 1", "n = 7 (happy)", "n = 2 (cycles)"],
  '''
def isHappy(n):
    seen = set()
    while n != 1 and n not in seen:  # <<
        seen.add(n)
        n = sum(int(d) ** 2 for d in str(n))  # <<
    return n == 1
''',
  F("isHappy", [([19], True), ([2], False), ([1], True), ([7], True)])),

P("plus_one", 140, "Plus One", "matrix_math", "Easy",
  "A number is stored as a digit array (most significant first). Return the array for number + 1.",
  "Walk from the last digit: a digit below 9 just increments and you're done; a 9 becomes 0 and the carry moves left. All 9s -> prepend 1.",
  "Return as soon as there's no carry.",
  "O(n)", "O(1)",
  [],
  ["all nines", "single 9", "no carry"],
  '''
def plusOne(digits):
    for i in range(len(digits) - 1, -1, -1):
        if digits[i] < 9:
            digits[i] += 1  # <<
            return digits
        digits[i] = 0  # <<
    return [1] + digits  # <<
''',
  F("plusOne", [([[1,2,3]], [1,2,4]), ([[9]], [1,0]), ([[4,3,2,1]], [4,3,2,2]), ([[9,9]], [1,0,0])])),

P("pow_x_n", 141, "Pow(x, n)", "matrix_math", "Medium",
  "Compute x raised to the integer power n in O(log n).",
  "Fast exponentiation: walk the bits of n; square x each step and multiply it into the result when the bit is 1.",
  "Negative n: use 1/x and -n. n = 0 -> 1.",
  "O(log n)", "O(1)",
  ["Can n be negative?", "Can x be 0 with negative n?"],
  ["n = 0", "negative n", "x = 1 or -1 with huge n"],
  '''
def myPow(x, n):
    if n < 0:
        x, n = 1 / x, -n  # <<
    res = 1.0
    while n:
        if n & 1:
            res *= x  # <<
        x *= x  # <<
        n >>= 1
    return res
''',
  F("myPow", [([2.0, 10], 1024.0), ([2.1, 3], 9.261), ([2.0, -2], 0.25), ([1.0, 0], 1.0)], compare="float")),

P("multiply_strings", 142, "Multiply Strings", "matrix_math", "Medium",
  "Multiply two non-negative integers given as strings, without converting them to int.",
  "Grade-school multiplication: digit i times digit j lands at position i + j + 1 of an array of size len1 + len2; push the carry to i + j.",
  "Strip leading zeros at the end, but return '0' if nothing is left.",
  "O(m·n)", "O(m + n)",
  [],
  ["either is '0'", "'99' * '99'", "single digits"],
  '''
def multiply(num1, num2):
    res = [0] * (len(num1) + len(num2))
    for i in range(len(num1) - 1, -1, -1):
        for j in range(len(num2) - 1, -1, -1):
            res[i + j + 1] += int(num1[i]) * int(num2[j])  # <<
            res[i + j] += res[i + j + 1] // 10  # <<
            res[i + j + 1] %= 10
    s = ''.join(map(str, res)).lstrip('0')
    return s or '0'  # <<
''',
  F("multiply", [(["2","3"], "6"), (["123","456"], "56088"), (["0","52"], "0"), (["99","99"], "9801")])),

P("detect_squares", 143, "Detect Squares", "matrix_math", "Medium",
  "Design add(point) and count(point): the number of axis-aligned squares with positive area formed by the query point and three stored points (duplicates count separately).",
  "Treat each stored point as the DIAGONAL corner: it must differ in both x and y by the same amount. The other two corners are then fixed; multiply their counts.",
  "Name the counter something other than `count` (the method is called count). Multiply counts for duplicates.",
  "O(n)", "O(n)",
  [],
  ["duplicate points", "query point on an axis line with stored points", "no squares"],
  '''
class DetectSquares:
    def __init__(self):
        self.cnt = Counter()
    def add(self, point):
        self.cnt[tuple(point)] += 1
    def count(self, point):
        x, y = point
        res = 0
        for px, py in list(self.cnt):
            if abs(px - x) != abs(py - y) or px == x:  # <<
                continue
            res += self.cnt[(px, py)] * self.cnt[(x, py)] * self.cnt[(px, y)]  # <<
        return res
''',
  D("DetectSquares", [(["DetectSquares","add","add","add","count","count","add","count"],
                       [[],[[3,10]],[[11,2]],[[3,2]],[[11,10]],[[14,8]],[[11,2]],[[11,10]]], [None,None,None,None,1,0,None,2])])),

P("counting_bits", 146, "Counting Bits", "bit", "Easy",
  "Return ans where ans[i] is the number of 1 bits in i, for i in 0..n, in O(n).",
  "i >> 1 drops the last bit, whose count you already know: bits(i) = bits(i >> 1) + (i & 1).",
  "dp[0] = 0; fill left to right.",
  "O(n)", "O(n)",
  [],
  ["n = 0", "powers of two"],
  '''
def countBits(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)  # <<
    return dp
''',
  F("countBits", [([2], [0,1,1]), ([5], [0,1,1,2,1,2]), ([0], [0])])),

P("reverse_bits", 147, "Reverse Bits", "bit", "Easy",
  "Reverse the bits of a 32-bit unsigned integer.",
  "32 times: shift the result left and OR in n's lowest bit, then shift n right.",
  "Loop exactly 32 times even if n becomes 0 (leading zeros become trailing zeros).",
  "O(1)", "O(1)",
  [],
  ["n = 0", "n = 1 -> 2^31", "all ones"],
  '''
def reverseBits(n):
    res = 0
    for _ in range(32):
        res = (res << 1) | (n & 1)  # <<
        n >>= 1  # <<
    return res
''',
  F("reverseBits", [([43261596], 964176192), ([4294967293], 3221225471), ([1], 2147483648), ([0], 0)])),

P("sum_two_integers", 149, "Sum of Two Integers", "bit", "Medium",
  "Return a + b without using + or -.",
  "XOR adds without carrying; AND shifted left is the carry. Repeat until no carry remains.",
  "Python ints are unbounded: mask to 32 bits so negative numbers terminate, and only unmask when the loop ended by overflowing the mask.",
  "O(1)", "O(1)",
  ["32-bit signed integers?"],
  ["negative + positive", "both negative", "zero"],
  '''
def getSum(a, b):
    mask = 0xFFFFFFFF
    while b & mask:  # <<
        a, b = a ^ b, (a & b) << 1  # <<
    return (a & mask) if b > 0 else a  # <<
''',
  F("getSum", [([1, 2], 3), ([2, 3], 5), ([-1, 1], 0), ([-2, -3], -5), ([0, 0], 0)])),

P("reverse_integer", 150, "Reverse Integer", "matrix_math", "Medium",
  "Reverse the digits of a signed 32-bit integer; return 0 if the result overflows 32 bits.",
  "Pop digits with divmod on the absolute value, push them onto the result, re-apply the sign, then range-check.",
  "In languages with fixed ints you must check overflow BEFORE pushing; in Python check the final range.",
  "O(log n)", "O(1)",
  [],
  ["trailing zeros 120 -> 21", "negative", "overflow -> 0"],
  '''
def reverse(x):
    sign = -1 if x < 0 else 1
    x = abs(x)
    res = 0
    while x:
        x, d = divmod(x, 10)  # <<
        res = res * 10 + d  # <<
    res *= sign
    return res if -2**31 <= res <= 2**31 - 1 else 0  # <<
''',
  F("reverse", [([123], 321), ([-123], -321), ([120], 21), ([1534236469], 0), ([0], 0)])),
]
