"""Coded problems: statement, insight, catch, complexity, edge cases, reference solution, tests.

In `solution`, lines ending with `  # <<` are KEY LINES: they get blanked in Fill-the-Gap.
Add more problems by appending another P(...) call; run `python validate.py` afterwards.
"""


def F(fn, cases, **opts):
    return {"kind": "function", "fn": fn,
            "cases": [{"args": list(a), "expected": e} for a, e in cases], **opts}


def D(cls, cases):
    return {"kind": "design", "cls": cls,
            "cases": [{"ops": o, "args": a, "expected": e} for o, a, e in cases]}


def P(id, num, title, pattern, diff, statement, insight, catch, time, space,
      clarify, edges, solution, tests):
    return dict(id=id, num=num, title=title, pattern=pattern, diff=diff, statement=statement,
                insight=insight, catch=catch, time=time, space=space, clarify=clarify,
                edges=edges, solution=solution, tests=tests)


_SUDOKU = [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],
           [".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],
           ["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],
           [".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],
           [".",".",".",".","8",".",".","7","9"]]
_SUDOKU_BAD = [row[:] for row in _SUDOKU]
_SUDOKU_BAD[0][0] = "8"
_BOARD = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]

PROBLEMS = [
# ───────────────────────── Arrays & Hashing ─────────────────────────
P("contains_duplicate", 1, "Contains Duplicate", "hashmap", "Easy",
  "Given an integer array nums, return True if any value appears at least twice.",
  "Remember what you've seen in a set; a repeat is an O(1) membership check.",
  "Check membership BEFORE adding, and return early on the first hit.",
  "O(n)", "O(n)",
  ["Can the array be empty?", "Is memory constrained (would sorting in place be preferred)?"],
  ["empty array -> False", "single element -> False", "duplicates at the very end"],
  '''
def containsDuplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:  # <<
            return True
        seen.add(x)  # <<
    return False
''',
  F("containsDuplicate", [([[1,2,3,1]], True), ([[1,2,3,4]], False),
                          ([[1,1,1,3,3,4,3,2,4,2]], True), ([[5]], False), ([[]], False)])),

P("valid_anagram", 2, "Valid Anagram", "hashmap", "Easy",
  "Given strings s and t, return True if t is an anagram (rearrangement) of s.",
  "Anagrams have identical character counts: +1 for s, -1 for t, all must end at 0.",
  "Different lengths can return False immediately. Ask: ASCII only or Unicode?",
  "O(n)", "O(1)",
  ["Lowercase English letters only, or Unicode?", "Are spaces/case significant?"],
  ["different lengths", "same letters different counts ('aab' vs 'abb')", "single chars"],
  '''
def isAnagram(s, t):
    if len(s) != len(t):  # <<
        return False
    count = {}
    for a, b in zip(s, t):
        count[a] = count.get(a, 0) + 1  # <<
        count[b] = count.get(b, 0) - 1  # <<
    return all(v == 0 for v in count.values())  # <<
''',
  F("isAnagram", [(["anagram","nagaram"], True), (["rat","car"], False),
                  (["a","ab"], False), (["ab","ba"], True), (["aab","abb"], False)])),

P("two_sum", 3, "Two Sum", "hashmap", "Easy",
  "Return indices of the two numbers in nums that add up to target. Exactly one solution exists; don't reuse an element.",
  "For each x, the partner you need is target - x. Look it up among values already passed (value -> index).",
  "Check for the complement BEFORE inserting x, or x can pair with itself.",
  "O(n)", "O(n)",
  ["Is there always exactly one answer?", "Can I return indices in any order?", "Negatives allowed?"],
  ["duplicate values that form the answer ([3,3], 6)", "negative numbers", "answer uses the last element"],
  '''
def twoSum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x  # <<
        if need in seen:  # <<
            return [seen[need], i]
        seen[x] = i  # <<
''',
  F("twoSum", [([[2,7,11,15], 9], [0,1]), ([[3,2,4], 6], [1,2]), ([[3,3], 6], [0,1]),
               ([[-3,4,3,90], 0], [0,2])], compare="unordered")),

P("group_anagrams", 4, "Group Anagrams", "hashmap", "Medium",
  "Group the strings in strs that are anagrams of each other. Any order.",
  "Map every word to a canonical key (letter-count tuple or sorted string); anagrams share a key.",
  "Lists aren't hashable: convert the count array to a tuple before using it as a key.",
  "O(n·k)", "O(n·k)",
  ["Lowercase letters only?", "Does output order matter?"],
  ["empty string ''", "single word", "no anagrams at all"],
  '''
def groupAnagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = [0] * 26
        for ch in s:
            key[ord(ch) - ord('a')] += 1  # <<
        groups[tuple(key)].append(s)  # <<
    return list(groups.values())
''',
  F("groupAnagrams", [([["eat","tea","tan","ate","nat","bat"]], [["bat"],["nat","tan"],["ate","eat","tea"]]),
                      ([[""]], [[""]]), ([["a"]], [["a"]])], compare="unordered_nested")),

P("top_k_frequent", 5, "Top K Frequent Elements", "hashmap", "Medium",
  "Return the k most frequent elements of nums. The answer is unique; any order.",
  "Count, then bucket by frequency: buckets[f] = values seen f times. Walk buckets from high f down.",
  "Frequency is at most n, so you need n+1 buckets. A heap gives O(n log k) if you blank on buckets.",
  "O(n)", "O(n)",
  ["Is the answer guaranteed unique?", "Can k equal the number of distinct values?"],
  ["k == number of distinct elements", "all elements equal", "single element"],
  '''
def topKFrequent(nums, k):
    count = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]
    for x, c in count.items():
        buckets[c].append(x)  # <<
    res = []
    for c in range(len(buckets) - 1, 0, -1):  # <<
        for x in buckets[c]:
            res.append(x)
            if len(res) == k:  # <<
                return res
''',
  F("topKFrequent", [([[1,1,1,2,2,3], 2], [1,2]), ([[1], 1], [1]), ([[4,4,5,5,5,6], 2], [5,4])],
    compare="unordered")),

P("product_except_self", 6, "Product of Array Except Self", "prefix", "Medium",
  "Return answer[i] = product of all nums except nums[i], in O(n) without division.",
  "answer[i] = (product of everything left of i) * (product of everything right of i). Two passes.",
  "Start both running products at 1 (the identity). Zeros are handled for free; division would break.",
  "O(n)", "O(1)",
  ["Can I use division? (usually no)", "Can there be zeros?", "Does the output array count as extra space?"],
  ["one zero", "two zeros", "negative numbers", "length 2"],
  '''
def productExceptSelf(nums):
    n = len(nums)
    res = [1] * n
    pre = 1
    for i in range(n):
        res[i] = pre  # <<
        pre *= nums[i]
    post = 1
    for i in range(n - 1, -1, -1):  # <<
        res[i] *= post  # <<
        post *= nums[i]
    return res
''',
  F("productExceptSelf", [([[1,2,3,4]], [24,12,8,6]), ([[-1,1,0,-3,3]], [0,0,9,0,0]),
                          ([[2,3]], [3,2]), ([[0,0]], [0,0])])),

P("valid_sudoku", 7, "Valid Sudoku", "hashmap", "Medium",
  "Determine whether a partially filled 9x9 board is valid: no repeated digit in any row, column or 3x3 box.",
  "One pass, three seen-checks per cell. Box id = (r // 3, c // 3).",
  "Encode the three keys so they can't collide: (r, v), (v, c), (r//3, c//3, v).",
  "O(1)", "O(1)",
  ["Do I need to check solvability, or only current validity?", "Empty cells are '.'?"],
  ["empty board", "duplicate only inside a 3x3 box", "duplicate in a column"],
  '''
def isValidSudoku(board):
    seen = set()
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == '.':
                continue
            keys = [(r, v), (v, c), (r // 3, c // 3, v)]  # <<
            if any(k in seen for k in keys):  # <<
                return False
            seen.update(keys)
    return True
''',
  F("isValidSudoku", [([_SUDOKU], True), ([_SUDOKU_BAD], False),
                      ([[["."] * 9 for _ in range(9)]], True)])),

P("longest_consecutive", 9, "Longest Consecutive Sequence", "hashmap", "Medium",
  "Return the length of the longest run of consecutive integers in unsorted nums, in O(n).",
  "Put everything in a set. Only START counting at x if x-1 is absent; then walk x+1, x+2...",
  "Without the 'x-1 not in set' guard you restart from the middle of runs: O(n²).",
  "O(n)", "O(n)",
  ["Can there be duplicates?", "Is O(n log n) sorting acceptable or must it be O(n)?"],
  ["empty array -> 0", "duplicates inside a run", "negative numbers"],
  '''
def longestConsecutive(nums):
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:  # <<
            length = 1
            while x + length in s:  # <<
                length += 1
            best = max(best, length)
    return best
''',
  F("longestConsecutive", [([[100,4,200,1,3,2]], 4), ([[0,3,7,2,5,8,4,6,0,1]], 9),
                           ([[]], 0), ([[1,2,0,1]], 3)])),

# ───────────────────────── Two Pointers ─────────────────────────
P("valid_palindrome", 10, "Valid Palindrome", "two_pointers", "Easy",
  "Return True if s reads the same forwards and backwards, considering only alphanumeric characters, ignoring case.",
  "Pointers at both ends walk inward, skipping non-alphanumerics, comparing lowercase chars.",
  "The inner skip loops need `l < r` too, or they run off the end on strings like '.,'.",
  "O(n)", "O(1)",
  ["Ignore case and punctuation?", "Is the empty string a palindrome?"],
  ["only punctuation ' ' or '.,'", "digits and letters mixed '0P'", "single character"],
  '''
def isPalindrome(s):
    l, r = 0, len(s) - 1
    while l < r:
        while l < r and not s[l].isalnum():  # <<
            l += 1
        while l < r and not s[r].isalnum():
            r -= 1
        if s[l].lower() != s[r].lower():  # <<
            return False
        l, r = l + 1, r - 1
    return True
''',
  F("isPalindrome", [(["A man, a plan, a canal: Panama"], True), (["race a car"], False),
                     ([" "], True), (["0P"], False), ([".,"], True)])),

P("two_sum_ii", 11, "Two Sum II (sorted input)", "two_pointers", "Medium",
  "numbers is sorted ascending. Return 1-indexed positions of two numbers summing to target, using O(1) extra space.",
  "Sorted means the sum is monotonic in each pointer: too small -> move left up, too big -> move right down.",
  "The output is 1-indexed. The hash map approach works but ignores the sorted property (and O(1) space).",
  "O(n)", "O(1)",
  ["Exactly one solution?", "1-indexed output?"],
  ["negative numbers", "answer is first and last element", "duplicates"],
  '''
def twoSum(numbers, target):
    l, r = 0, len(numbers) - 1
    while l < r:
        cur = numbers[l] + numbers[r]
        if cur == target:
            return [l + 1, r + 1]
        if cur < target:  # <<
            l += 1
        else:
            r -= 1  # <<
''',
  F("twoSum", [([[2,7,11,15], 9], [1,2]), ([[2,3,4], 6], [1,3]), ([[-1,0], -1], [1,2])])),

P("three_sum", 12, "3Sum", "two_pointers", "Medium",
  "Return all unique triplets in nums that sum to 0.",
  "Sort. Fix nums[i], then run Two Sum II on the rest with two pointers.",
  "Duplicates: skip equal nums[i], and after a hit advance l past equal values.",
  "O(n²)", "O(1)",
  ["Must triplets be unique?", "Output order matter?"],
  ["all zeros [0,0,0]", "no triplet", "many duplicates [-2,0,0,2,2]"],
  '''
def threeSum(nums):
    nums.sort()  # <<
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:  # <<
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                l += 1
                while l < r and nums[l] == nums[l - 1]:  # <<
                    l += 1
    return res
''',
  F("threeSum", [([[-1,0,1,2,-1,-4]], [[-1,-1,2],[-1,0,1]]), ([[0,1,1]], []), ([[0,0,0]], [[0,0,0]]),
                 ([[-2,0,0,2,2]], [[-2,0,2]])], compare="unordered_nested")),

P("container_water", 13, "Container With Most Water", "two_pointers", "Medium",
  "height[i] is a vertical line. Pick two lines that, with the x-axis, hold the most water. Return the area.",
  "Start widest. Area is limited by the shorter line, so moving the taller one can never help: move the shorter.",
  "Area = (r - l) * min(h[l], h[r]). Ties: moving either side is fine.",
  "O(n)", "O(1)",
  ["At least 2 lines?", "Can heights be 0?"],
  ["two lines only", "equal heights at both ends", "tallest lines in the middle"],
  '''
def maxArea(height):
    l, r = 0, len(height) - 1
    best = 0
    while l < r:
        best = max(best, (r - l) * min(height[l], height[r]))  # <<
        if height[l] < height[r]:  # <<
            l += 1
        else:
            r -= 1
    return best
''',
  F("maxArea", [([[1,8,6,2,5,4,8,3,7]], 49), ([[1,1]], 1), ([[4,3,2,1,4]], 16)])),

P("trapping_rain", 14, "Trapping Rain Water", "two_pointers", "Hard",
  "Given elevation heights, compute how much rain water is trapped.",
  "Water at i = min(maxLeft, maxRight) - h[i]. Process the side with the smaller wall: its max is the binding one.",
  "Update the running max BEFORE adding water so the amount is never negative.",
  "O(n)", "O(1)",
  ["Can the array be empty?", "Heights non-negative?"],
  ["empty or 1-2 bars -> 0", "strictly increasing -> 0", "valley in the middle"],
  '''
def trap(height):
    l, r = 0, len(height) - 1
    lmax = rmax = 0
    water = 0
    while l < r:
        if height[l] < height[r]:  # <<
            lmax = max(lmax, height[l])
            water += lmax - height[l]  # <<
            l += 1
        else:
            rmax = max(rmax, height[r])
            water += rmax - height[r]
            r -= 1
    return water
''',
  F("trap", [([[0,1,0,2,1,0,1,3,2,1,2,1]], 6), ([[4,2,0,3,2,5]], 9), ([[]], 0), ([[1,2,3]], 0)])),

# ───────────────────────── Sliding Window ─────────────────────────
P("best_time_stock", 15, "Best Time to Buy and Sell Stock", "sliding_window", "Easy",
  "prices[i] is the price on day i. Buy once, sell later once. Return max profit (0 if none).",
  "Track the cheapest price so far (left of the window); profit at each day = price - cheapest.",
  "Compute profit before updating the minimum, so you never sell on the day you buy.",
  "O(n)", "O(1)",
  ["Must sell after buying?", "Can I return 0 if no profit?"],
  ["strictly decreasing -> 0", "single day", "min appears after max"],
  '''
def maxProfit(prices):
    lowest = prices[0]
    best = 0
    for p in prices[1:]:
        best = max(best, p - lowest)  # <<
        lowest = min(lowest, p)  # <<
    return best
''',
  F("maxProfit", [([[7,1,5,3,6,4]], 5), ([[7,6,4,3,1]], 0), ([[2,4,1]], 2), ([[5]], 0)])),

P("longest_substring", 16, "Longest Substring Without Repeating Characters", "sliding_window", "Medium",
  "Return the length of the longest substring of s with all distinct characters.",
  "Grow the window right; while s[r] is already inside, shrink from the left. Window is always valid after.",
  "Shrink with a WHILE, not an if: the duplicate may be several positions in.",
  "O(n)", "O(k)",
  ["Character set: ASCII? Unicode?", "Empty string allowed?"],
  ["empty string -> 0", "all same 'bbbb'", "space characters ' '"],
  '''
def lengthOfLongestSubstring(s):
    seen = set()
    l = best = 0
    for r in range(len(s)):
        while s[r] in seen:  # <<
            seen.remove(s[l])  # <<
            l += 1
        seen.add(s[r])
        best = max(best, r - l + 1)  # <<
    return best
''',
  F("lengthOfLongestSubstring", [(["abcabcbb"], 3), (["bbbbb"], 1), (["pwwkew"], 3), ([""], 0), ([" "], 1)])),

P("char_replacement", 17, "Longest Repeating Character Replacement", "sliding_window", "Medium",
  "You may replace up to k characters in s (uppercase). Return the longest substring of one repeated letter you can get.",
  "A window is valid if (length - count of its most frequent letter) <= k. Grow right, shrink when invalid.",
  "maxf never needs to decrease: a stale maxf only makes the window keep its size, never report a wrong larger answer.",
  "O(n)", "O(1)",
  ["Uppercase letters only?", "Can k be 0?"],
  ["k = 0", "k >= len(s)", "single character"],
  '''
def characterReplacement(s, k):
    count = {}
    l = best = maxf = 0
    for r in range(len(s)):
        count[s[r]] = count.get(s[r], 0) + 1
        maxf = max(maxf, count[s[r]])  # <<
        while (r - l + 1) - maxf > k:  # <<
            count[s[l]] -= 1
            l += 1
        best = max(best, r - l + 1)
    return best
''',
  F("characterReplacement", [(["ABAB", 2], 4), (["AABABBA", 1], 4), (["A", 0], 1), (["AAAA", 0], 4)])),

P("min_window", 19, "Minimum Window Substring", "sliding_window", "Hard",
  "Return the smallest substring of s containing every character of t (with multiplicity), or '' if none.",
  "need = Counter(t), missing = len(t). Expand r; once missing == 0, shrink l as far as possible, recording the best.",
  "Only decrement `missing` when need[ch] was positive; only increment it when need[s[l]] goes back above 0.",
  "O(n)", "O(k)",
  ["Is t's multiplicity required ('aa' needs two a's)?", "Case sensitive?", "Return '' when impossible?"],
  ["t longer than s", "t has repeated chars", "answer is the whole string"],
  '''
def minWindow(s, t):
    need = Counter(t)
    missing = len(t)
    l = 0
    best = (0, float('inf'))
    for r, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1  # <<
        while missing == 0:  # <<
            if r - l < best[1] - best[0]:
                best = (l, r)
            need[s[l]] += 1
            if need[s[l]] > 0:  # <<
                missing += 1
            l += 1
    return "" if best[1] == float('inf') else s[best[0]:best[1] + 1]
''',
  F("minWindow", [(["ADOBECODEBANC", "ABC"], "BANC"), (["a", "a"], "a"), (["a", "aa"], ""), (["ab", "b"], "b")])),

# ───────────────────────── Stack ─────────────────────────
P("valid_parentheses", 21, "Valid Parentheses", "stack", "Easy",
  "Given a string of ()[]{} characters, return True if every bracket is closed by the right type in the right order.",
  "Push openers. On a closer, the top of the stack must be its matching opener.",
  "Two failure modes: closer with an empty stack, and leftover openers at the end.",
  "O(n)", "O(n)",
  ["Only bracket characters?", "Empty string valid?"],
  ["starts with a closer ']'", "only openers '(('", "interleaved '([)]'"],
  '''
def isValid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack[-1] != pairs[ch]:  # <<
                return False
            stack.pop()
        else:
            stack.append(ch)  # <<
    return not stack  # <<
''',
  F("isValid", [(["()"], True), (["()[]{}"], True), (["(]"], False), (["([)]"], False),
                (["{[]}"], True), (["("], False), (["]"], False)])),

P("min_stack", 22, "Min Stack", "stack", "Medium",
  "Design a stack with push, pop, top and getMin, all O(1).",
  "Keep a parallel stack where each entry is the min of everything at or below it.",
  "Pop BOTH stacks together so they stay aligned.",
  "O(1)", "O(n)",
  ["Will pop/top/getMin only be called on non-empty stacks?"],
  ["pushing a value equal to the current min", "min removed by pop", "negative values"],
  '''
class MinStack:
    def __init__(self):
        self.stack = []
        self.mins = []
    def push(self, val):
        self.stack.append(val)
        self.mins.append(min(val, self.mins[-1] if self.mins else val))  # <<
    def pop(self):
        self.stack.pop()
        self.mins.pop()  # <<
    def top(self):
        return self.stack[-1]
    def getMin(self):
        return self.mins[-1]  # <<
''',
  D("MinStack", [(["MinStack","push","push","push","getMin","pop","top","getMin"],
                  [[],[-2],[0],[-3],[],[],[],[]], [None,None,None,None,-3,None,0,-2]),
                 (["MinStack","push","push","getMin","pop","getMin"],
                  [[],[1],[1],[],[],[]], [None,None,None,1,None,1])])),

P("eval_rpn", 23, "Evaluate Reverse Polish Notation", "stack", "Medium",
  "Evaluate an arithmetic expression in Reverse Polish Notation (tokens list). Division truncates toward zero.",
  "Numbers get pushed; an operator pops two, applies, pushes the result.",
  "Pop order: b = pop() first, then a. Truncate with int(a / b), not a // b (floor is wrong for negatives).",
  "O(n)", "O(n)",
  ["Is the expression always valid?", "Division truncates toward zero?"],
  ["negative numbers as tokens '-11'", "division of negatives", "single number"],
  '''
def evalRPN(tokens):
    stack = []
    for t in tokens:
        if t in {'+', '-', '*', '/'}:
            b, a = stack.pop(), stack.pop()  # <<
            if t == '+': stack.append(a + b)
            elif t == '-': stack.append(a - b)
            elif t == '*': stack.append(a * b)
            else: stack.append(int(a / b))  # <<
        else:
            stack.append(int(t))  # <<
    return stack[0]
''',
  F("evalRPN", [([["2","1","+","3","*"]], 9), ([["4","13","5","/","+"]], 6),
                ([["10","6","9","3","+","-11","*","/","*","17","+","5","+"]], 22), ([["7"]], 7)])),

P("daily_temperatures", 25, "Daily Temperatures", "mono_stack", "Medium",
  "For each day, return how many days until a warmer temperature (0 if never).",
  "Keep a stack of unresolved days with decreasing temps. A warmer day pops (and answers) every colder day on top.",
  "Store INDICES, not temperatures: you need i - j for the answer.",
  "O(n)", "O(n)",
  ["Strictly warmer, or warmer-or-equal?"],
  ["strictly decreasing -> all 0", "strictly increasing", "equal temperatures"],
  '''
def dailyTemperatures(temperatures):
    res = [0] * len(temperatures)
    stack = []
    for i, t in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < t:  # <<
            j = stack.pop()
            res[j] = i - j  # <<
        stack.append(i)  # <<
    return res
''',
  F("dailyTemperatures", [([[73,74,75,71,69,72,76,73]], [1,1,4,2,1,1,0,0]), ([[30,40,50,60]], [1,1,1,0]),
                          ([[30,60,90]], [1,1,0]), ([[50,50]], [0,0])])),

P("largest_rectangle", 27, "Largest Rectangle in Histogram", "mono_stack", "Hard",
  "Given bar heights (width 1 each), return the area of the largest rectangle in the histogram.",
  "Increasing stack of (start, height). A shorter bar pops taller ones: each popped bar's rectangle ends here. The new bar extends back to the last popped start.",
  "After the loop, bars still on the stack extend to the END: width = n - start.",
  "O(n)", "O(n)",
  ["Heights non-negative?", "Can the array be empty?"],
  ["single bar", "all equal heights", "strictly increasing heights"],
  '''
def largestRectangleArea(heights):
    stack = []
    best = 0
    for i, h in enumerate(heights):
        start = i
        while stack and stack[-1][1] > h:  # <<
            idx, height = stack.pop()
            best = max(best, height * (i - idx))  # <<
            start = idx  # <<
        stack.append((start, h))
    for idx, height in stack:
        best = max(best, height * (len(heights) - idx))  # <<
    return best
''',
  F("largestRectangleArea", [([[2,1,5,6,2,3]], 10), ([[2,4]], 4), ([[1]], 1), ([[2,2,2]], 6)])),

# ───────────────────────── Binary Search ─────────────────────────
P("binary_search", 28, "Binary Search", "binary_search", "Easy",
  "nums is sorted ascending. Return the index of target, or -1. Must be O(log n).",
  "Halve the search range each step by comparing nums[mid] with target.",
  "`lo <= hi` (inclusive bounds) and move PAST mid (mid ± 1), or you loop forever.",
  "O(log n)", "O(1)",
  ["Are values distinct?", "Return -1 when absent?"],
  ["single element", "target smaller/larger than all", "target at either end"],
  '''
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:  # <<
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1  # <<
        else:
            hi = mid - 1  # <<
    return -1
''',
  F("search", [([[-1,0,3,5,9,12], 9], 4), ([[-1,0,3,5,9,12], 2], -1), ([[5], 5], 0), ([[5], -5], -1)])),

P("koko", 30, "Koko Eating Bananas", "binary_search", "Medium",
  "piles[i] bananas; Koko eats at speed k per hour (one pile per hour max). Return the minimum k to finish within h hours.",
  "Binary search on the ANSWER k in [1, max(piles)]. hours(k) is monotonic: find the smallest feasible k.",
  "Ceil division: (p + k - 1) // k. Use lo < hi and keep mid when feasible (hi = mid).",
  "O(n log m)", "O(1)",
  ["Is h >= len(piles) guaranteed?", "Pile sizes up to 10^9?"],
  ["h == len(piles) -> max(piles)", "one pile", "huge h -> 1"],
  '''
def minEatingSpeed(piles, h):
    lo, hi = 1, max(piles)  # <<
    while lo < hi:
        mid = (lo + hi) // 2
        hours = sum((p + mid - 1) // mid for p in piles)  # <<
        if hours <= h:
            hi = mid  # <<
        else:
            lo = mid + 1
    return lo
''',
  F("minEatingSpeed", [([[3,6,7,11], 8], 4), ([[30,11,23,4,20], 5], 30), ([[30,11,23,4,20], 6], 23),
                       ([[1000000000], 2], 500000000)])),

P("find_min_rotated", 31, "Find Minimum in Rotated Sorted Array", "binary_search", "Medium",
  "A sorted array of unique values was rotated. Return its minimum in O(log n).",
  "Compare mid with hi: if nums[mid] > nums[hi], the drop (minimum) is to the right; else it's at mid or left.",
  "Compare to nums[hi], not nums[lo] - it handles the not-rotated case cleanly. Use lo < hi; hi = mid.",
  "O(log n)", "O(1)",
  ["Values unique?", "Could it be rotated 0 times?"],
  ["not rotated", "two elements [2,1]", "single element"],
  '''
def findMin(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:  # <<
            lo = mid + 1
        else:
            hi = mid  # <<
    return nums[lo]
''',
  F("findMin", [([[3,4,5,1,2]], 1), ([[4,5,6,7,0,1,2]], 0), ([[11,13,15,17]], 11), ([[2,1]], 1)])),

P("search_rotated", 32, "Search in Rotated Sorted Array", "binary_search", "Medium",
  "Search for target in a rotated sorted array of unique values. Return its index or -1, in O(log n).",
  "One half around mid is always sorted. Check if target lies inside the sorted half; if so go there, else go to the other half.",
  "Use <= in `nums[lo] <= nums[mid]` (lo can equal mid). Range checks are half-open around mid.",
  "O(log n)", "O(1)",
  ["Values unique?", "Return -1 if absent?"],
  ["two elements", "target is the pivot", "not rotated"],
  '''
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:  # <<
            if nums[lo] <= target < nums[mid]:  # <<
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:  # <<
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
''',
  F("search", [([[4,5,6,7,0,1,2], 0], 4), ([[4,5,6,7,0,1,2], 3], -1), ([[1], 0], -1), ([[3,1], 1], 1),
               ([[5,1,3], 5], 0)])),

P("time_map", 33, "Time Based Key-Value Store", "binary_search", "Medium",
  "Design TimeMap: set(key, value, timestamp) and get(key, timestamp) returning the value with the largest timestamp <= given one ('' if none). Timestamps are set in increasing order.",
  "Per key, keep a list of (timestamp, value) - already sorted. get = binary search for the last timestamp <= t.",
  "Record the candidate when arr[mid][0] <= t, then search RIGHT for a later one.",
  "O(log n)", "O(n)",
  ["Are timestamps strictly increasing per key?", "Return '' if nothing qualifies?"],
  ["get before any set", "timestamp earlier than all entries", "exact timestamp match"],
  '''
class TimeMap:
    def __init__(self):
        self.store = defaultdict(list)
    def set(self, key, value, timestamp):
        self.store[key].append((timestamp, value))
    def get(self, key, timestamp):
        arr = self.store[key]
        lo, hi = 0, len(arr) - 1
        res = ""
        while lo <= hi:
            mid = (lo + hi) // 2
            if arr[mid][0] <= timestamp:  # <<
                res = arr[mid][1]  # <<
                lo = mid + 1
            else:
                hi = mid - 1
        return res
''',
  D("TimeMap", [(["TimeMap","set","get","get","set","get","get"],
                 [[],["foo","bar",1],["foo",1],["foo",3],["foo","bar2",4],["foo",4],["foo",5]],
                 [None,None,"bar","bar",None,"bar2","bar2"]),
                (["TimeMap","get","set","get"], [[],["x",1],["x","v",5],["x",4]], [None,"",None,""])])),

# ───────────────────────── Linked List ─────────────────────────
P("reverse_list", 35, "Reverse Linked List", "linked_list", "Easy",
  "Reverse a singly linked list and return the new head.",
  "Walk once, flipping each next pointer to point backwards. Save next before you overwrite it.",
  "Return prev (the old tail), not cur (which ends as None).",
  "O(n)", "O(1)",
  ["Iterative or recursive preferred?", "Can the list be empty?"],
  ["empty list", "single node", "two nodes"],
  '''
def reverseList(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next  # <<
        cur.next = prev  # <<
        prev, cur = cur, nxt  # <<
    return prev
''',
  F("reverseList", [([[1,2,3,4,5]], [5,4,3,2,1]), ([[1,2]], [2,1]), ([[]], [])],
    arg_types=["linked"], ret_type="linked")),

P("merge_two", 36, "Merge Two Sorted Lists", "linked_list", "Easy",
  "Merge two sorted linked lists into one sorted list and return its head.",
  "Dummy head + tail pointer; always attach the smaller front node.",
  "When one list runs out, attach the rest of the other in one step.",
  "O(n + m)", "O(1)",
  ["Can either list be empty?", "Splice existing nodes or create new ones?"],
  ["both empty", "one empty", "equal values"],
  '''
def mergeTwoLists(list1, list2):
    dummy = tail = ListNode()  # <<
    while list1 and list2:
        if list1.val <= list2.val:
            tail.next, list1 = list1, list1.next  # <<
        else:
            tail.next, list2 = list2, list2.next
        tail = tail.next
    tail.next = list1 or list2  # <<
    return dummy.next
''',
  F("mergeTwoLists", [([[1,2,4],[1,3,4]], [1,1,2,3,4,4]), ([[],[]], []), ([[],[0]], [0])],
    arg_types=["linked","linked"], ret_type="linked")),

P("reorder_list", 37, "Reorder List", "linked_list", "Medium",
  "Reorder L0->L1->...->Ln into L0->Ln->L1->Ln-1->... in place.",
  "Three known moves: find the middle (fast/slow), reverse the second half, then weave the halves together.",
  "Cut the list at the middle (slow.next = None) or you create a cycle.",
  "O(n)", "O(1)",
  ["Must it be in place (no array)?"],
  ["single node", "two nodes", "odd vs even length"],
  '''
def reorderList(head):
    slow, fast = head, head.next
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next  # <<
    second = slow.next
    slow.next = None  # <<
    prev = None
    while second:
        nxt = second.next
        second.next = prev
        prev, second = second, nxt
    first, second = head, prev
    while second:
        n1, n2 = first.next, second.next
        first.next = second  # <<
        second.next = n1  # <<
        first, second = n1, n2
''',
  F("reorderList", [([[1,2,3,4]], [1,4,2,3]), ([[1,2,3,4,5]], [1,5,2,4,3]), ([[1]], [1]), ([[1,2]], [1,2])],
    arg_types=["linked"], inplace=0)),

P("remove_nth", 38, "Remove Nth Node From End of List", "linked_list", "Medium",
  "Remove the n-th node from the end of the list in one pass and return the head.",
  "Gap trick: move fast n+1 steps ahead of slow (from a dummy). When fast hits None, slow is just before the target.",
  "Dummy head handles removing the first node. Gap is n+1 so slow stops BEFORE the target.",
  "O(n)", "O(1)",
  ["Is n always valid?", "One pass required?"],
  ["remove the head", "single node list", "remove the tail"],
  '''
def removeNthFromEnd(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1):  # <<
        fast = fast.next
    while fast:
        fast, slow = fast.next, slow.next  # <<
    slow.next = slow.next.next  # <<
    return dummy.next
''',
  F("removeNthFromEnd", [([[1,2,3,4,5], 2], [1,2,3,5]), ([[1], 1], []), ([[1,2], 1], [1]), ([[1,2], 2], [2])],
    arg_types=["linked", None], ret_type="linked")),

P("lru_cache", 43, "LRU Cache", "linked_list", "Medium",
  "Design an LRU cache with get(key) and put(key, value) in O(1); evict the least recently used key when over capacity.",
  "Hash map + recency order. In Python, OrderedDict is exactly that: move_to_end on use, popitem(last=False) to evict. (Be ready to explain the hashmap + doubly linked list version.)",
  "A get counts as a use. Update the value AND the recency on put of an existing key.",
  "O(1)", "O(n)",
  ["Does put on an existing key refresh recency?", "Capacity >= 1?"],
  ["capacity 1", "put existing key", "get missing key -> -1"],
  '''
class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = OrderedDict()
    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)  # <<
        return self.cache[key]
    def put(self, key, value):
        self.cache[key] = value
        self.cache.move_to_end(key)  # <<
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)  # <<
''',
  D("LRUCache", [(["LRUCache","put","put","get","put","get","put","get","get","get"],
                  [[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]],
                  [None,None,None,1,None,-1,None,-1,3,4]),
                 (["LRUCache","put","put","get"], [[1],[1,1],[1,5],[1]], [None,None,None,5])])),

# ───────────────────────── Trees ─────────────────────────
P("invert_tree", 46, "Invert Binary Tree", "tree_dfs", "Easy",
  "Mirror a binary tree (swap every left and right child) and return its root.",
  "Each node: swap its children, recursively inverting both.",
  "Use the inverted subtrees in the swap (or swap first then recurse); return root.",
  "O(n)", "O(h)",
  ["Return the same root object?"],
  ["empty tree", "single node", "skewed tree"],
  '''
def invertTree(root):
    if not root:
        return None  # <<
    root.left, root.right = invertTree(root.right), invertTree(root.left)  # <<
    return root
''',
  F("invertTree", [([[4,2,7,1,3,6,9]], [4,7,2,9,6,3,1]), ([[2,1,3]], [2,3,1]), ([[]], [])],
    arg_types=["tree"], ret_type="tree")),

P("max_depth", 47, "Maximum Depth of Binary Tree", "tree_dfs", "Easy",
  "Return the number of nodes on the longest root-to-leaf path.",
  "depth(node) = 1 + max(depth(left), depth(right)); depth(None) = 0.",
  "Base case returns 0, not 1. For BFS: count levels.",
  "O(n)", "O(h)",
  ["Depth counted in nodes or edges?"],
  ["empty tree -> 0", "skewed tree", "single node -> 1"],
  '''
def maxDepth(root):
    if not root:
        return 0  # <<
    return 1 + max(maxDepth(root.left), maxDepth(root.right))  # <<
''',
  F("maxDepth", [([[3,9,20,None,None,15,7]], 3), ([[1,None,2]], 2), ([[]], 0)], arg_types=["tree"])),

P("diameter", 48, "Diameter of Binary Tree", "tree_dfs", "Easy",
  "Return the length (in edges) of the longest path between any two nodes.",
  "At each node, the longest path THROUGH it = leftHeight + rightHeight. dfs returns height; a global tracks the best.",
  "What you RETURN (height) differs from what you RECORD (diameter). The path need not pass through root.",
  "O(n)", "O(h)",
  ["Length in edges or nodes?"],
  ["single node -> 0", "path not through root", "skewed tree"],
  '''
def diameterOfBinaryTree(root):
    best = 0
    def depth(node):
        nonlocal best  # <<
        if not node:
            return 0
        l, r = depth(node.left), depth(node.right)
        best = max(best, l + r)  # <<
        return 1 + max(l, r)  # <<
    depth(root)
    return best
''',
  F("diameterOfBinaryTree", [([[1,2,3,4,5]], 3), ([[1,2]], 1), ([[1]], 0),
                             ([[1,2,None,3,4,5,None,None,6]], 4)], arg_types=["tree"])),

P("balanced_tree", 49, "Balanced Binary Tree", "tree_dfs", "Easy",
  "Return True if, for every node, its subtrees' heights differ by at most 1.",
  "Return height bottom-up, using -1 as a sentinel for 'already unbalanced' so the check is one pass.",
  "Checking only the root's subtrees is wrong: every node must be balanced.",
  "O(n)", "O(h)",
  ["Is an empty tree balanced?"],
  ["empty tree -> True", "imbalance deep in a subtree", "skewed of height 3"],
  '''
def isBalanced(root):
    def h(node):
        if not node:
            return 0
        l, r = h(node.left), h(node.right)
        if l < 0 or r < 0 or abs(l - r) > 1:  # <<
            return -1
        return 1 + max(l, r)  # <<
    return h(root) >= 0  # <<
''',
  F("isBalanced", [([[3,9,20,None,None,15,7]], True), ([[1,2,2,3,3,None,None,4,4]], False), ([[]], True),
                   ([[1,None,2,None,3]], False)], arg_types=["tree"])),

P("same_tree", 50, "Same Tree", "tree_dfs", "Easy",
  "Return True if two binary trees have identical structure and values.",
  "Both None -> True; exactly one None or values differ -> False; else recurse on both sides.",
  "Order of checks matters: handle the None cases before touching .val.",
  "O(n)", "O(h)",
  [],
  ["both empty", "same values different shape", "one empty"],
  '''
def isSameTree(p, q):
    if not p and not q:
        return True  # <<
    if not p or not q or p.val != q.val:  # <<
        return False
    return isSameTree(p.left, q.left) and isSameTree(p.right, q.right)  # <<
''',
  F("isSameTree", [([[1,2,3],[1,2,3]], True), ([[1,2],[1,None,2]], False), ([[1,2,1],[1,1,2]], False),
                   ([[],[]], True)], arg_types=["tree","tree"])),

P("validate_bst", 56, "Validate Binary Search Tree", "tree_dfs", "Medium",
  "Return True if the tree is a valid BST (left subtree < node < right subtree, strictly, everywhere).",
  "Pass down an allowed (lo, hi) range. Going left tightens hi to node.val, going right tightens lo.",
  "Comparing only with direct children is wrong: a deep node can violate an ancestor. Duplicates are invalid.",
  "O(n)", "O(h)",
  ["Are duplicates allowed?", "Value range (could hit int limits)?"],
  ["duplicate values", "violation two levels down [5,4,6,null,null,3,7]", "single node"],
  '''
def isValidBST(root):
    def ok(node, lo, hi):
        if not node:
            return True
        if not (lo < node.val < hi):  # <<
            return False
        return ok(node.left, lo, node.val) and ok(node.right, node.val, hi)  # <<
    return ok(root, float('-inf'), float('inf'))
''',
  F("isValidBST", [([[2,1,3]], True), ([[5,1,4,None,None,3,6]], False), ([[5,4,6,None,None,3,7]], False),
                   ([[2,2,2]], False)], arg_types=["tree"])),

P("kth_smallest_bst", 57, "Kth Smallest Element in a BST", "tree_dfs", "Medium",
  "Return the k-th smallest value (1-indexed) in a BST.",
  "In-order traversal of a BST visits values in sorted order. Stop at the k-th visit.",
  "The iterative version (explicit stack) lets you stop early without a global.",
  "O(h + k)", "O(h)",
  ["Is k always valid?"],
  ["k = 1 (leftmost)", "k = n (rightmost)", "skewed tree"],
  '''
def kthSmallest(root, k):
    stack = []
    cur = root
    while True:
        while cur:
            stack.append(cur)  # <<
            cur = cur.left
        cur = stack.pop()
        k -= 1
        if k == 0:  # <<
            return cur.val
        cur = cur.right  # <<
''',
  F("kthSmallest", [([[3,1,4,None,2], 1], 1), ([[5,3,6,2,4,None,None,1], 3], 3), ([[1], 1], 1)],
    arg_types=["tree", None])),

P("max_path_sum", 59, "Binary Tree Maximum Path Sum", "tree_dfs", "Hard",
  "Return the maximum sum of any path (any node to any node, no node reused).",
  "Same shape as Diameter. dfs returns the best ONE-sided gain downward; record node + leftGain + rightGain as a candidate.",
  "Clamp negative gains to 0 (just don't take that branch). Initialise best to root.val, not 0 (all-negative trees).",
  "O(n)", "O(h)",
  ["Can values be negative?", "Must the path contain at least one node?"],
  ["all negative values", "single node", "best path doesn't include root"],
  '''
def maxPathSum(root):
    best = root.val
    def gain(node):
        nonlocal best
        if not node:
            return 0
        l = max(gain(node.left), 0)  # <<
        r = max(gain(node.right), 0)
        best = max(best, node.val + l + r)  # <<
        return node.val + max(l, r)  # <<
    gain(root)
    return best
''',
  F("maxPathSum", [([[1,2,3]], 6), ([[-10,9,20,None,None,15,7]], 42), ([[-3]], -3), ([[2,-1]], 2)],
    arg_types=["tree"])),

P("level_order", 53, "Binary Tree Level Order Traversal", "tree_bfs", "Medium",
  "Return node values level by level, left to right, as a list of lists.",
  "BFS with a queue; freeze len(q) at the start of each level so you process exactly that level.",
  "Empty tree must return [] (don't enqueue None).",
  "O(n)", "O(n)",
  [],
  ["empty tree", "single node", "skewed tree"],
  '''
def levelOrder(root):
    res = []
    q = deque([root] if root else [])
    while q:
        level = []
        for _ in range(len(q)):  # <<
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)  # <<
            if node.right: q.append(node.right)
        res.append(level)  # <<
    return res
''',
  F("levelOrder", [([[3,9,20,None,None,15,7]], [[3],[9,20],[15,7]]), ([[1]], [[1]]), ([[]], [])],
    arg_types=["tree"])),

P("right_side_view", 54, "Binary Tree Right Side View", "tree_bfs", "Medium",
  "Return the values visible from the right side, top to bottom.",
  "Level-order BFS; the LAST node of each level is visible.",
  "A left-side node is visible when the right side is shorter - DFS that only goes right is wrong.",
  "O(n)", "O(n)",
  [],
  ["left subtree deeper than right", "empty tree", "single node"],
  '''
def rightSideView(root):
    res = []
    q = deque([root] if root else [])
    while q:
        res.append(q[-1].val)  # <<
        for _ in range(len(q)):
            node = q.popleft()
            if node.left: q.append(node.left)  # <<
            if node.right: q.append(node.right)
    return res
''',
  F("rightSideView", [([[1,2,3,None,5,None,4]], [1,3,4]), ([[1,None,3]], [1,3]), ([[]], []), ([[1,2]], [1,2])],
    arg_types=["tree"])),

# ───────────────────────── Tries ─────────────────────────
P("implement_trie", 61, "Implement Trie (Prefix Tree)", "trie", "Medium",
  "Implement insert(word), search(word) (exact word) and startsWith(prefix).",
  "Nested dicts: each level maps a char to the next node. Mark word ends with a sentinel key.",
  "search needs the END marker; startsWith only needs the path to exist.",
  "O(L)", "O(total chars)",
  ["Lowercase a-z only?"],
  ["prefix of an inserted word searched as a word", "searching before any insert", "inserting a word twice"],
  '''
class Trie:
    def __init__(self):
        self.root = {}
    def insert(self, word):
        cur = self.root
        for ch in word:
            cur = cur.setdefault(ch, {})  # <<
        cur['$'] = True  # <<
    def _walk(self, s):
        cur = self.root
        for ch in s:
            if ch not in cur:
                return None
            cur = cur[ch]
        return cur
    def search(self, word):
        node = self._walk(word)
        return node is not None and '$' in node  # <<
    def startsWith(self, prefix):
        return self._walk(prefix) is not None
''',
  D("Trie", [(["Trie","insert","search","search","startsWith","insert","search"],
              [[],["apple"],["apple"],["app"],["app"],["app"],["app"]],
              [None,None,True,False,True,None,True])])),

# ───────────────────────── Heap ─────────────────────────
P("kth_largest_array", 67, "Kth Largest Element in an Array", "heap", "Medium",
  "Return the k-th largest element in an unsorted array.",
  "Keep a min-heap of size k: it holds the k largest seen; its top is the k-th largest.",
  "Pop when size exceeds k (not >= k). Quickselect is O(n) average if they push for it.",
  "O(n log k)", "O(k)",
  ["k-th largest counting duplicates?", "Is k always valid?"],
  ["duplicates", "k = 1", "k = n"],
  '''
def findKthLargest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)  # <<
        if len(heap) > k:  # <<
            heapq.heappop(heap)
    return heap[0]  # <<
''',
  F("findKthLargest", [([[3,2,1,5,6,4], 2], 5), ([[3,2,3,1,2,4,5,5,6], 4], 4), ([[1], 1], 1)])),

P("last_stone", 65, "Last Stone Weight", "heap", "Easy",
  "Repeatedly smash the two heaviest stones; equal ones vanish, else the difference remains. Return the last weight or 0.",
  "Python has only a min-heap: store negatives to get a max-heap.",
  "Push back -(a - b) when they differ; return 0 if the heap ends empty.",
  "O(n log n)", "O(n)",
  [],
  ["single stone", "two equal stones -> 0", "all equal"],
  '''
def lastStoneWeight(stones):
    heap = [-s for s in stones]  # <<
    heapq.heapify(heap)
    while len(heap) > 1:
        a = -heapq.heappop(heap)
        b = -heapq.heappop(heap)
        if a != b:
            heapq.heappush(heap, -(a - b))  # <<
    return -heap[0] if heap else 0  # <<
''',
  F("lastStoneWeight", [([[2,7,4,1,8,1]], 1), ([[1]], 1), ([[2,2]], 0)])),

P("k_closest", 66, "K Closest Points to Origin", "heap", "Medium",
  "Return the k points closest to (0, 0). Any order.",
  "Max-heap of size k keyed by -distance²: evict the farthest whenever size exceeds k.",
  "Compare squared distances - no sqrt needed.",
  "O(n log k)", "O(k)",
  ["Any order OK?", "Ties?"],
  ["k = n", "points with equal distance", "negative coordinates"],
  '''
def kClosest(points, k):
    heap = []
    for x, y in points:
        heapq.heappush(heap, (-(x * x + y * y), x, y))  # <<
        if len(heap) > k:
            heapq.heappop(heap)  # <<
    return [[x, y] for _, x, y in heap]  # <<
''',
  F("kClosest", [([[[1,3],[-2,2]], 1], [[-2,2]]), ([[[3,3],[5,-1],[-2,4]], 2], [[3,3],[-2,4]])],
    compare="unordered")),

P("meeting_rooms_ii", 134, "Meeting Rooms II", "heap", "Medium",
  "Given meeting intervals [start, end], return the minimum number of rooms required.",
  "Sort by start. Min-heap of end times = rooms in use. If the earliest-ending room is free by this start, reuse it.",
  "Free means end <= start (a meeting ending at 10 frees the room for one starting at 10).",
  "O(n log n)", "O(n)",
  ["Does end == start count as overlap?"],
  ["no meetings", "all overlapping", "back-to-back meetings"],
  '''
def minMeetingRooms(intervals):
    intervals.sort(key=lambda x: x[0])  # <<
    ends = []
    for s, e in intervals:
        if ends and ends[0] <= s:  # <<
            heapq.heappop(ends)
        heapq.heappush(ends, e)  # <<
    return len(ends)
''',
  F("minMeetingRooms", [([[[0,30],[5,10],[15,20]]], 2), ([[[7,10],[2,4]]], 1), ([[[1,5],[2,6],[3,7]]], 3),
                        ([[[1,5],[5,10]]], 1)])),

# ───────────────────────── Backtracking ─────────────────────────
P("subsets", 71, "Subsets", "backtracking", "Medium",
  "Return all subsets (the power set) of an array of unique integers.",
  "Every node of the recursion tree is a valid subset: record path at the START of each call, then try adding each later element.",
  "Append a COPY (path[:]). Recurse with i + 1 so each element is used at most once.",
  "O(n·2^n)", "O(n)",
  ["Elements unique?", "Order of subsets matter?"],
  ["empty input -> [[]]", "single element"],
  '''
def subsets(nums):
    res, path = [], []
    def bt(start):
        res.append(path[:])  # <<
        for i in range(start, len(nums)):
            path.append(nums[i])
            bt(i + 1)  # <<
            path.pop()  # <<
    bt(0)
    return res
''',
  F("subsets", [([[1,2,3]], [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]), ([[0]], [[],[0]])],
    compare="unordered_nested")),

P("combination_sum", 72, "Combination Sum", "backtracking", "Medium",
  "Return all unique combinations of candidates (reusable, distinct values) that sum to target.",
  "Backtrack with (start, remaining). Recurse with i (not i+1) because a number can be reused.",
  "Passing i keeps combos non-decreasing, which prevents permutations-of-the-same-combo duplicates.",
  "O(2^t)", "O(t)",
  ["Can a number be reused unlimited times?", "Are candidates positive?"],
  ["no combination -> []", "target equals a single candidate", "candidate larger than target"],
  '''
def combinationSum(candidates, target):
    res, path = [], []
    def bt(start, remain):
        if remain == 0:
            res.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remain:  # <<
                continue
            path.append(candidates[i])
            bt(i, remain - candidates[i])  # <<
            path.pop()
    bt(0, target)
    return res
''',
  F("combinationSum", [([[2,3,6,7], 7], [[2,2,3],[7]]), ([[2,3,5], 8], [[2,2,2,2],[2,3,3],[3,5]]), ([[2], 1], [])],
    compare="unordered_nested")),

P("permutations", 73, "Permutations", "backtracking", "Medium",
  "Return all permutations of an array of distinct integers.",
  "Each level picks any unused element. A `used` array tracks what's in the path.",
  "Unmark used[i] when you backtrack. Path is complete when len(path) == len(nums).",
  "O(n·n!)", "O(n)",
  ["Elements distinct?"],
  ["single element", "two elements"],
  '''
def permute(nums):
    res, path = [], []
    used = [False] * len(nums)
    def bt():
        if len(path) == len(nums):  # <<
            res.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:  # <<
                continue
            used[i] = True
            path.append(nums[i])
            bt()
            path.pop()
            used[i] = False  # <<
    bt()
    return res
''',
  F("permute", [([[1,2,3]], [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]), ([[0,1]], [[0,1],[1,0]]),
                ([[1]], [[1]])], compare="unordered")),

P("word_search", 76, "Word Search", "backtracking", "Medium",
  "Return True if word can be formed from sequentially adjacent (4-dir) cells of board, each cell used at most once.",
  "DFS from every cell matching word[0]. Mark the cell during the path, restore it on the way back.",
  "Restore the cell (undo) even when the branch fails, or other start points see a corrupted board.",
  "O(m·n·4^L)", "O(L)",
  ["Can a cell be reused?", "Case-sensitive?"],
  ["word longer than the cell count", "needs to revisit a cell ('ABCB')", "single cell board"],
  '''
def exist(board, word):
    R, C = len(board), len(board[0])
    def dfs(r, c, i):
        if i == len(word):
            return True  # <<
        if r < 0 or c < 0 or r >= R or c >= C or board[r][c] != word[i]:
            return False
        board[r][c] = '#'  # <<
        found = any(dfs(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        board[r][c] = word[i]  # <<
        return found
    return any(dfs(r, c, 0) for r in range(R) for c in range(C))
''',
  F("exist", [([_BOARD, "ABCCED"], True), ([_BOARD, "SEE"], True), ([_BOARD, "ABCB"], False), ([[["a"]], "a"], True)])),

# ───────────────────────── Graphs ─────────────────────────
P("num_islands", 80, "Number of Islands", "grid_graph", "Medium",
  "Count islands of '1's (4-directionally connected) in a grid of '1'/'0' strings.",
  "Scan cells; each unvisited '1' starts a DFS that sinks its whole island. Count the starts.",
  "Mark visited BEFORE recursing (sink to '0') or you loop forever. Grid values are strings.",
  "O(m·n)", "O(m·n)",
  ["Can I modify the grid?", "4- or 8-directional?"],
  ["all water", "all land", "diagonal-only connections"],
  '''
def numIslands(grid):
    R, C = len(grid), len(grid[0])
    def dfs(r, c):
        if r < 0 or c < 0 or r >= R or c >= C or grid[r][c] != '1':  # <<
            return
        grid[r][c] = '0'  # <<
        dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1  # <<
    return count
''',
  F("numIslands", [([[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]], 1),
                   ([[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]], 3),
                   ([[["0"]]], 0), ([[["1","0","1"]]], 2)])),

P("max_area_island", 82, "Max Area of Island", "grid_graph", "Medium",
  "Return the area of the largest island of 1s (4-directional) in an int grid, or 0.",
  "Number of Islands, but dfs RETURNS the size: 1 + sum of the four neighbours' sizes.",
  "Sink cells as you count them; default=0 for an all-water grid.",
  "O(m·n)", "O(m·n)",
  ["Can I modify the grid?"],
  ["no land -> 0", "one big island", "several equal islands"],
  '''
def maxAreaOfIsland(grid):
    R, C = len(grid), len(grid[0])
    def area(r, c):
        if r < 0 or c < 0 or r >= R or c >= C or grid[r][c] != 1:
            return 0
        grid[r][c] = 0  # <<
        return 1 + area(r + 1, c) + area(r - 1, c) + area(r, c + 1) + area(r, c - 1)  # <<
    return max((area(r, c) for r in range(R) for c in range(C)), default=0)  # <<
''',
  F("maxAreaOfIsland", [([[[1,1,0,0,0],[1,1,0,0,0],[0,0,0,1,1],[0,0,0,1,1]]], 4), ([[[0,0,0]]], 0),
                        ([[[0,0,1,0],[1,1,0,0],[0,1,0,1]]], 3)])),

P("rotting_oranges", 85, "Rotting Oranges", "grid_graph", "Medium",
  "0 empty, 1 fresh, 2 rotten. Each minute rot spreads 4-directionally. Return minutes until no fresh remain, or -1.",
  "Multi-source BFS: start with ALL rotten oranges in the queue; each BFS level is one minute.",
  "Loop while q AND fresh > 0, otherwise you count an extra minute at the end. No fresh at start -> 0.",
  "O(m·n)", "O(m·n)",
  ["Can I modify the grid?", "Return -1 if impossible?"],
  ["no fresh oranges -> 0", "fresh orange unreachable -> -1", "no rotten oranges but fresh exist -> -1"],
  '''
def orangesRotting(grid):
    R, C = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == 2:
                q.append((r, c))  # <<
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while q and fresh:  # <<
        for _ in range(len(q)):
            r, c = q.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    q.append((nr, nc))
        minutes += 1  # <<
    return minutes if fresh == 0 else -1
''',
  F("orangesRotting", [([[[2,1,1],[1,1,0],[0,1,1]]], 4), ([[[2,1,1],[0,1,1],[1,0,1]]], -1), ([[[0,2]]], 0),
                       ([[[1]]], -1)])),

P("course_schedule", 87, "Course Schedule", "topo_sort", "Medium",
  "numCourses courses; prerequisites[i] = [a, b] means take b before a. Can you finish all courses?",
  "It's 'does this directed graph have a cycle?'. Kahn's algorithm: repeatedly take courses with no remaining prereqs; if you process all, no cycle.",
  "Edge direction: b -> a, and indegree goes up on a.",
  "O(V + E)", "O(V + E)",
  ["Can there be duplicate edges?", "Self-loops?"],
  ["no prerequisites", "two-course cycle", "disconnected components"],
  '''
def canFinish(numCourses, prerequisites):
    adj = defaultdict(list)
    indeg = [0] * numCourses
    for a, b in prerequisites:
        adj[b].append(a)  # <<
        indeg[a] += 1
    q = deque(i for i in range(numCourses) if indeg[i] == 0)  # <<
    done = 0
    while q:
        u = q.popleft()
        done += 1
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:  # <<
                q.append(v)
    return done == numCourses
''',
  F("canFinish", [([2, [[1,0]]], True), ([2, [[1,0],[0,1]]], False), ([3, []], True),
                  ([4, [[1,0],[2,1],[3,2],[1,3]]], False)])),

P("count_components", 90, "Number of Connected Components", "union_find", "Medium",
  "n nodes (0..n-1) and undirected edges. Return the number of connected components.",
  "Start with n components; every union of two DIFFERENT roots merges two into one: count -= 1.",
  "Always union the ROOTS (find first), not the raw nodes.",
  "O(E·α(n))", "O(n)",
  ["Can edges repeat?"],
  ["no edges -> n", "all connected -> 1", "duplicate edges"],
  '''
def countComponents(n, edges):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    count = n
    for a, b in edges:
        ra, rb = find(a), find(b)  # <<
        if ra != rb:
            parent[ra] = rb  # <<
            count -= 1  # <<
    return count
''',
  F("countComponents", [([5, [[0,1],[1,2],[3,4]]], 2), ([5, [[0,1],[1,2],[2,3],[3,4]]], 1), ([3, []], 3),
                        ([3, [[0,1],[1,0]]], 2)])),

P("redundant_connection", 91, "Redundant Connection", "union_find", "Medium",
  "A tree of n nodes (1..n) plus one extra edge. Return the edge that, if removed, leaves a tree (the last such in input).",
  "Union edges in order; the first edge whose endpoints already share a root closes the cycle.",
  "Nodes are 1-indexed: parent array of size n + 1.",
  "O(n·α(n))", "O(n)",
  ["Nodes 1-indexed?", "Return the last qualifying edge?"],
  ["cycle includes the first edge", "cycle at the end"],
  '''
def findRedundantConnection(edges):
    parent = list(range(len(edges) + 1))  # <<
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            return [a, b]  # <<
        parent[ra] = rb  # <<
''',
  F("findRedundantConnection", [([[[1,2],[1,3],[2,3]]], [2,3]), ([[[1,2],[2,3],[3,4],[1,4],[1,5]]], [1,4])])),

# ───────────────────────── 1D DP ─────────────────────────
P("climbing_stairs", 99, "Climbing Stairs", "dp_1d", "Easy",
  "You can climb 1 or 2 steps. How many distinct ways to reach step n?",
  "ways(n) = ways(n-1) + ways(n-2): your last move was a 1 or a 2. It's Fibonacci - keep two variables.",
  "Base: ways(0) = ways(1) = 1.",
  "O(n)", "O(1)",
  ["n >= 1?"],
  ["n = 1", "n = 2", "large n (no recursion without memo)"],
  '''
def climbStairs(n):
    a, b = 1, 1  # <<
    for _ in range(n - 1):
        a, b = b, a + b  # <<
    return b
''',
  F("climbStairs", [([1], 1), ([2], 2), ([3], 3), ([5], 8), ([10], 89)])),

P("house_robber", 101, "House Robber", "dp_1d", "Medium",
  "Rob houses for maximum money without robbing two adjacent houses.",
  "best(i) = max(best(i-1), best(i-2) + nums[i]): skip this house, or rob it plus the best two back.",
  "Only two previous values are needed: roll them as (prev, cur).",
  "O(n)", "O(1)",
  ["Can values be 0?"],
  ["single house", "two houses", "best skips two in a row [2,1,1,2]"],
  '''
def rob(nums):
    prev, cur = 0, 0
    for x in nums:
        prev, cur = cur, max(cur, prev + x)  # <<
    return cur
''',
  F("rob", [([[1,2,3,1]], 4), ([[2,7,9,3,1]], 12), ([[2,1,1,2]], 4), ([[5]], 5)])),

P("house_robber_ii", 102, "House Robber II", "dp_1d", "Medium",
  "Same as House Robber but the houses are in a circle (first and last are adjacent).",
  "First and last can't both be robbed: answer = max(rob(without first), rob(without last)).",
  "Single house: return it directly (both slices would be empty).",
  "O(n)", "O(1)",
  [],
  ["one house", "two houses", "three houses"],
  '''
def rob(nums):
    def line(arr):
        prev = cur = 0
        for x in arr:
            prev, cur = cur, max(cur, prev + x)
        return cur
    if len(nums) == 1:
        return nums[0]  # <<
    return max(line(nums[1:]), line(nums[:-1]))  # <<
''',
  F("rob", [([[2,3,2]], 3), ([[1,2,3,1]], 4), ([[1,2,3]], 3), ([[5]], 5)])),

P("decode_ways", 105, "Decode Ways", "dp_1d", "Medium",
  "Letters map A=1..Z=26. Count the ways to decode a digit string.",
  "dp[i] = ways for the first i chars: + dp[i-1] if the last digit is 1-9, + dp[i-2] if the last two form 10-26.",
  "'0' alone is not decodable; '06' is not valid. dp[0] = 1 (empty prefix).",
  "O(n)", "O(n)",
  ["Can the string start with '0'?"],
  ["leading zero '06' -> 0", "'10' -> 1", "'27' -> 1"],
  '''
def numDecodings(s):
    dp = [0] * (len(s) + 1)
    dp[0] = 1
    for i in range(1, len(s) + 1):
        if s[i - 1] != '0':
            dp[i] += dp[i - 1]  # <<
        if i >= 2 and '10' <= s[i - 2:i] <= '26':  # <<
            dp[i] += dp[i - 2]
    return dp[len(s)]
''',
  F("numDecodings", [(["12"], 2), (["226"], 3), (["06"], 0), (["10"], 1), (["27"], 1)])),

P("coin_change", 106, "Coin Change", "dp_1d", "Medium",
  "Return the fewest coins needed to make amount (unlimited coins of each type), or -1.",
  "dp[a] = min over coins c of dp[a - c] + 1. Build up from 0.",
  "Initialise with infinity (not 0) and dp[0] = 0. Greedy (largest coin first) FAILS for e.g. [1,3,4], 6.",
  "O(n·amount)", "O(amount)",
  ["Return -1 if impossible?", "amount can be 0?"],
  ["amount = 0 -> 0", "impossible -> -1", "greedy trap [1,3,4], 6"],
  '''
def coinChange(coins, amount):
    dp = [0] + [float('inf')] * amount  # <<
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)  # <<
    return dp[amount] if dp[amount] != float('inf') else -1  # <<
''',
  F("coinChange", [([[1,2,5], 11], 3), ([[2], 3], -1), ([[1], 0], 0), ([[1,3,4], 6], 2)])),

P("word_break", 108, "Word Break", "dp_1d", "Medium",
  "Return True if s can be split into a sequence of dictionary words (reuse allowed).",
  "dp[i] = can the prefix s[:i] be segmented? dp[i] is True if some dp[j] is True and s[j:i] is a word.",
  "dp[0] = True (empty prefix). Use a set for O(1) word lookup.",
  "O(n²)", "O(n)",
  ["Can words be reused?"],
  ["whole string is one word", "'catsandog' style near-miss", "overlapping words"],
  '''
def wordBreak(s, wordDict):
    words = set(wordDict)
    dp = [True] + [False] * len(s)  # <<
    for i in range(1, len(s) + 1):
        for j in range(i):
            if dp[j] and s[j:i] in words:  # <<
                dp[i] = True
                break
    return dp[len(s)]  # <<
''',
  F("wordBreak", [(["leetcode", ["leet","code"]], True), (["applepenapple", ["apple","pen"]], True),
                  (["catsandog", ["cats","dog","sand","and","cat"]], False)])),

P("lis", 109, "Longest Increasing Subsequence", "dp_1d", "Medium",
  "Return the length of the longest strictly increasing subsequence.",
  "dp[i] = LIS ending exactly at i = 1 + max dp[j] for j < i with nums[j] < nums[i].",
  "Answer is max(dp), not dp[-1]. Follow-up: O(n log n) with bisect on a 'tails' array.",
  "O(n²)", "O(n)",
  ["Strictly increasing?", "Is O(n²) acceptable?"],
  ["all equal -> 1", "strictly decreasing -> 1", "single element"],
  '''
def lengthOfLIS(nums):
    dp = [1] * len(nums)  # <<
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:  # <<
                dp[i] = max(dp[i], dp[j] + 1)  # <<
    return max(dp)
''',
  F("lengthOfLIS", [([[10,9,2,5,3,7,101,18]], 4), ([[0,1,0,3,2,3]], 4), ([[7,7,7,7]], 1)])),

# ───────────────────────── 2D DP ─────────────────────────
P("unique_paths", 111, "Unique Paths", "dp_2d", "Medium",
  "A robot moves only right or down on an m x n grid. Count the paths from top-left to bottom-right.",
  "dp[i][j] = dp[i-1][j] + dp[i][j-1]. First row and first column are all 1.",
  "Initialise the whole grid to 1 and start loops at 1.",
  "O(m·n)", "O(m·n)",
  [],
  ["1 x 1 grid -> 1", "single row", "single column"],
  '''
def uniquePaths(m, n):
    dp = [[1] * n for _ in range(m)]  # <<
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]  # <<
    return dp[m - 1][n - 1]
''',
  F("uniquePaths", [([3, 7], 28), ([3, 2], 3), ([1, 1], 1)])),

P("lcs", 112, "Longest Common Subsequence", "dp_2d", "Medium",
  "Return the length of the longest common subsequence of two strings.",
  "dp[i][j] = LCS of a[:i], b[:j]. Match: 1 + diagonal. No match: max(up, left).",
  "Use an (m+1) x (n+1) table so row/col 0 is the empty prefix; index chars with i-1, j-1.",
  "O(m·n)", "O(m·n)",
  [],
  ["no common chars -> 0", "identical strings", "one empty string"],
  '''
def longestCommonSubsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]  # <<
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1  # <<
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])  # <<
    return dp[m][n]
''',
  F("longestCommonSubsequence", [(["abcde","ace"], 3), (["abc","abc"], 3), (["abc","def"], 0)])),

P("coin_change_ii", 114, "Coin Change II (count ways)", "dp_2d", "Medium",
  "Count the combinations of coins (unlimited) that make amount.",
  "Unbounded knapsack: loop COINS outer, amounts inner. dp[a] += dp[a - c].",
  "Swapping the loops counts permutations (1+2 and 2+1 separately) - wrong answer.",
  "O(n·amount)", "O(amount)",
  ["Combinations, not permutations?"],
  ["amount 0 -> 1", "impossible -> 0", "single coin equals amount"],
  '''
def change(amount, coins):
    dp = [1] + [0] * amount  # <<
    for c in coins:  # <<
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]  # <<
    return dp[amount]
''',
  F("change", [([5, [1,2,5]], 4), ([3, [2]], 0), ([10, [10]], 1), ([0, [1]], 1)])),

P("edit_distance", 119, "Edit Distance", "dp_2d", "Medium",
  "Return the minimum insert/delete/replace operations to turn word1 into word2.",
  "dp[i][j] = cost for prefixes. Match: diagonal. Else 1 + min(delete=up, insert=left, replace=diagonal).",
  "Base row/col: dp[i][0] = i, dp[0][j] = j (all deletes / all inserts).",
  "O(m·n)", "O(m·n)",
  [],
  ["one empty string", "identical strings -> 0", "completely different"],
  '''
def minDistance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i  # <<
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])  # <<
    return dp[m][n]
''',
  F("minDistance", [(["horse","ros"], 3), (["intention","execution"], 5), (["","a"], 1), (["abc","abc"], 0)])),

# ───────────────────────── Greedy ─────────────────────────
P("max_subarray", 122, "Maximum Subarray", "greedy", "Medium",
  "Return the largest sum of a contiguous non-empty subarray.",
  "Kadane: at each x, either extend the running sum or restart at x - whichever is bigger.",
  "Initialise with nums[0], not 0, so all-negative arrays work.",
  "O(n)", "O(1)",
  ["Non-empty subarray required?"],
  ["all negative", "single element", "whole array is best"],
  '''
def maxSubArray(nums):
    cur = best = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)  # <<
        best = max(best, cur)  # <<
    return best
''',
  F("maxSubArray", [([[-2,1,-3,4,-1,2,1,-5,4]], 6), ([[1]], 1), ([[5,4,-1,7,8]], 23), ([[-3,-1,-2]], -1)])),

P("jump_game", 123, "Jump Game", "greedy", "Medium",
  "nums[i] is your max jump length from i. Can you reach the last index from index 0?",
  "Walk backwards keeping a 'goal'. If i can reach goal, i becomes the new goal. Success if goal reaches 0.",
  "Equivalent forward version: track the farthest reachable index; fail if i ever exceeds it.",
  "O(n)", "O(1)",
  [],
  ["single element -> True", "zero at the start", "zero you can jump over"],
  '''
def canJump(nums):
    goal = len(nums) - 1
    for i in range(len(nums) - 1, -1, -1):  # <<
        if i + nums[i] >= goal:  # <<
            goal = i
    return goal == 0  # <<
''',
  F("canJump", [([[2,3,1,1,4]], True), ([[3,2,1,0,4]], False), ([[0]], True), ([[0,1]], False)])),

P("jump_game_ii", 124, "Jump Game II", "greedy", "Medium",
  "Return the minimum number of jumps to reach the last index (always reachable).",
  "BFS by ranges: the current jump covers [.., end]; while scanning it, track the farthest next reach. At end, jump.",
  "Loop to len(nums) - 1 (don't count a jump from the last index).",
  "O(n)", "O(1)",
  [],
  ["single element -> 0", "one big jump", "all ones"],
  '''
def jump(nums):
    jumps = 0
    end = far = 0
    for i in range(len(nums) - 1):  # <<
        far = max(far, i + nums[i])
        if i == end:  # <<
            jumps += 1
            end = far  # <<
    return jumps
''',
  F("jump", [([[2,3,1,1,4]], 2), ([[2,3,0,1,4]], 2), ([[0]], 0), ([[1,1,1,1]], 3)])),

P("gas_station", 125, "Gas Station", "greedy", "Medium",
  "Circular route: gas[i] fuel at station i, cost[i] to reach i+1. Return the start index to complete the loop, or -1.",
  "If total gas >= total cost an answer exists. Whenever the running tank goes negative, no station so far can be the start: restart at i + 1.",
  "The total check is what guarantees the found start works.",
  "O(n)", "O(1)",
  ["Is the answer unique if it exists?"],
  ["total gas < total cost -> -1", "start at 0", "single station"],
  '''
def canCompleteCircuit(gas, cost):
    if sum(gas) < sum(cost):  # <<
        return -1
    tank = start = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:  # <<
            tank = 0
            start = i + 1  # <<
    return start
''',
  F("canCompleteCircuit", [([[1,2,3,4,5],[3,4,5,1,2]], 3), ([[2,3,4],[3,4,3]], -1), ([[5],[4]], 0)])),

# ───────────────────────── Intervals ─────────────────────────
P("merge_intervals", 131, "Merge Intervals", "intervals", "Medium",
  "Merge all overlapping intervals and return the result.",
  "Sort by start. Each interval either overlaps the last merged one (extend its end) or starts a new one.",
  "Extend with max(end, e) - a contained interval must not shrink the end. Touching ([1,4],[4,5]) counts as overlap.",
  "O(n log n)", "O(n)",
  ["Do touching intervals merge?", "Is input sorted?"],
  ["touching intervals", "one interval inside another", "single interval"],
  '''
def merge(intervals):
    intervals.sort(key=lambda x: x[0])  # <<
    res = [intervals[0]]
    for s, e in intervals[1:]:
        if s <= res[-1][1]:  # <<
            res[-1][1] = max(res[-1][1], e)  # <<
        else:
            res.append([s, e])
    return res
''',
  F("merge", [([[[1,3],[2,6],[8,10],[15,18]]], [[1,6],[8,10],[15,18]]), ([[[1,4],[4,5]]], [[1,5]]),
              ([[[1,4],[2,3]]], [[1,4]]), ([[[4,5],[1,2]]], [[1,2],[4,5]])])),

P("insert_interval", 130, "Insert Interval", "intervals", "Medium",
  "Insert newInterval into sorted non-overlapping intervals, merging as needed.",
  "Three phases: intervals entirely before (copy), overlapping (absorb into new), entirely after (copy the rest).",
  "Overlap test: not (b < s or a > e). Return immediately once you pass the new interval.",
  "O(n)", "O(n)",
  ["Input sorted and non-overlapping?"],
  ["empty list", "new interval goes at the very end", "new interval covers everything"],
  '''
def insert(intervals, newInterval):
    res = []
    s, e = newInterval
    for i, (a, b) in enumerate(intervals):
        if b < s:
            res.append([a, b])  # <<
        elif a > e:
            return res + [[s, e]] + intervals[i:]  # <<
        else:
            s, e = min(s, a), max(e, b)  # <<
    return res + [[s, e]]
''',
  F("insert", [([[[1,3],[6,9]], [2,5]], [[1,5],[6,9]]),
               ([[[1,2],[3,5],[6,7],[8,10],[12,16]], [4,8]], [[1,2],[3,10],[12,16]]),
               ([[], [5,7]], [[5,7]]), ([[[1,5]], [0,9]], [[0,9]])])),

P("non_overlapping", 132, "Non-overlapping Intervals", "intervals", "Medium",
  "Return the minimum number of intervals to remove so the rest don't overlap.",
  "Sort by END. Greedily keep the interval that ends earliest; anything starting before that end is removed.",
  "Touching ([1,2],[2,3]) is NOT overlap here, so the keep test is s >= end.",
  "O(n log n)", "O(1)",
  ["Do touching intervals overlap?"],
  ["identical intervals", "touching intervals", "one interval covering many"],
  '''
def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])  # <<
    removed = 0
    end = float('-inf')
    for s, e in intervals:
        if s >= end:  # <<
            end = e
        else:
            removed += 1  # <<
    return removed
''',
  F("eraseOverlapIntervals", [([[[1,2],[2,3],[3,4],[1,3]]], 1), ([[[1,2],[1,2],[1,2]]], 2), ([[[1,2],[2,3]]], 0)])),

# ───────────────────────── Bit Manipulation ─────────────────────────
P("single_number", 144, "Single Number", "bit", "Easy",
  "Every element appears twice except one. Find it in O(n) time, O(1) space.",
  "XOR everything: pairs cancel (a ^ a = 0), leaving the single one.",
  "A set works but is O(n) space - the interviewer wants XOR.",
  "O(n)", "O(1)",
  [],
  ["single element", "negative numbers"],
  '''
def singleNumber(nums):
    res = 0
    for x in nums:
        res ^= x  # <<
    return res
''',
  F("singleNumber", [([[2,2,1]], 1), ([[4,1,2,1,2]], 4), ([[1]], 1), ([[-1,3,3]], -1)])),

P("hamming_weight", 145, "Number of 1 Bits", "bit", "Easy",
  "Return the number of set bits in a positive integer n.",
  "n & (n - 1) clears the lowest set bit. Count how many times until n is 0.",
  "Shifting and testing n & 1 also works (32 iterations).",
  "O(1)", "O(1)",
  [],
  ["n = 1", "power of two", "all bits set"],
  '''
def hammingWeight(n):
    count = 0
    while n:
        n &= n - 1  # <<
        count += 1  # <<
    return count
''',
  F("hammingWeight", [([11], 3), ([128], 1), ([2147483645], 30)])),

P("missing_number", 148, "Missing Number", "bit", "Easy",
  "nums has n distinct numbers from [0, n]. Return the missing one.",
  "XOR all indices 0..n with all values; everything pairs up except the missing number. (Or n(n+1)/2 - sum.)",
  "Start with res = n because indices only go to n-1.",
  "O(n)", "O(1)",
  [],
  ["missing 0", "missing n", "single element"],
  '''
def missingNumber(nums):
    res = len(nums)  # <<
    for i, x in enumerate(nums):
        res ^= i ^ x  # <<
    return res
''',
  F("missingNumber", [([[3,0,1]], 2), ([[0,1]], 2), ([[9,6,4,2,3,5,7,0,1]], 8), ([[1]], 0)])),
]
