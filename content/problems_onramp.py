"""On-ramp problems: not in the NeetCode 150, added so courses start gently and teach their prerequisites.

The Recursion course (Tree DFS, Backtracking and DP all build on it) is made of these, and Prefix Sum and
Grid get an Easy first step. Each carries its own walkthrough (walk) and slow-but-correct brute force,
like the twist problems. They are part of the games and the courses; `onramp=True` only keeps them out
of the "NeetCode 150" counts.
"""
from .problems import P, F, D

PROBLEMS_ONRAMP = []


def _add(p, **extra):
    PROBLEMS_ONRAMP.append(dict(p, onramp=True, **extra))


# ── Recursion ──
_add(P('fib_number', 174, 'Fibonacci Number', 'recursion', 'Easy',
  'The Fibonacci numbers are F(0) = 0, F(1) = 1, and F(n) = F(n - 1) + F(n - 2) for n > 1. Given n (0 <= n <= 30), return F(n).',
  'The definition is already a recursion: two base cases and a smaller call. Plain recursion recomputes the same values exponentially often; remembering each F(k) the first time makes it O(n).',
  'Both 0 and 1 must be base cases, or the calls go negative and never stop. Without the memo it is correct but O(2ⁿ).',
  'O(n)', 'O(n)',
  ['What range can n take?', 'Is F(0) defined as 0 or 1?'],
  ['n = 0 -> 0', 'n = 1 -> 1', 'n = 30 -> 832040'],
  '''
def fib(n):
    memo = {}
    def f(k):
        if k < 2:  # <<
            return k
        if k not in memo:
            memo[k] = f(k - 1) + f(k - 2)  # <<
        return memo[k]
    return f(n)
''',
  F('fib', [([0], 0), ([1], 1), ([2], 1), ([3], 2), ([4], 3), ([10], 55), ([20], 6765), ([30], 832040)])),
  walk=('Recurse straight from the definition, F(n) = F(n - 1) + F(n - 2): correct, but each call makes two more, so O(2ⁿ).',
        ['base case: k < 2 -> return k', 'otherwise the answer is f(k - 1) + f(k - 2)',
         'store each answer in a memo the first time it is computed', 'return f(n)']),
  brute_code='def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)   # recomputes the same values again and again')

_add(P('power_of_two', 175, 'Power of Two', 'recursion', 'Easy',
  'Given an integer n, return True if it is a power of two (n == 2ˣ for some integer x >= 0), otherwise False.',
  'A power of two is 1, or an even number whose half is a power of two. That sentence is the recursion: base case 1, smaller call n // 2.',
  'n <= 0 is never a power of two: check it first, or the halving never reaches 1. Any odd number other than 1 fails at once.',
  'O(log n)', 'O(log n)',
  ['Can n be zero or negative?', 'Does 1 (2⁰) count?'],
  ['n = 1 -> True', 'n = 0 -> False', 'negative n -> False', 'n = 6, even but not a power -> False'],
  '''
def isPowerOfTwo(n):
    if n <= 0:  # <<
        return False
    if n == 1:  # <<
        return True
    if n % 2:
        return False
    return isPowerOfTwo(n // 2)  # <<
''',
  F('isPowerOfTwo', [([1], True), ([16], True), ([3], False), ([0], False), ([-16], False), ([6], False),
                     ([1024], True), ([2 ** 30], True), ([2 ** 30 + 2], False)])),
  walk=('Multiply 1 by 2 until you reach or pass n: O(log n). Already fast; the point here is to say the same idea as a recursion.',
        ['n <= 0 -> False', 'n == 1 -> True (it is 2⁰)', 'n odd -> False', 'otherwise ask the same question about n // 2']),
  brute_code='def isPowerOfTwo(n):\n    p = 1\n    while p < n:      # try 1, 2, 4, 8, ... until we reach or pass n\n        p *= 2\n    return p == n')

_add(P('kth_grammar', 176, 'K-th Symbol in Grammar', 'recursion', 'Medium',
  'Build a table of n rows. Row 1 is "0". Each next row replaces every 0 in the row above with "01" and every 1 with "10", so row 2 is "01" and row 3 is "0110". Given n (up to 30) and k (1-indexed), return the k-th symbol of row n as an integer.',
  'Symbol k of row n comes from symbol (k + 1) // 2 of row n - 1: it equals that parent when k is odd and is flipped when k is even. Recurse on the parent down to row 1.',
  'Building the rows takes 2ⁿ memory, far too much at n = 30. With 1-indexing the parent is (k + 1) // 2, not k // 2.',
  'O(n)', 'O(n)',
  ['Is k 1-indexed?', 'How large can n get?'],
  ['n = 1 -> 0', 'k = 1 -> always 0', 'the last symbol of a row'],
  '''
def kthGrammar(n, k):
    if n == 1:  # <<
        return 0
    parent = kthGrammar(n - 1, (k + 1) // 2)  # <<
    return parent if k % 2 else 1 - parent  # <<
''',
  F('kthGrammar', [([1, 1], 0), ([2, 1], 0), ([2, 2], 1), ([3, 3], 1), ([3, 4], 0), ([4, 5], 1),
                   ([5, 11], 0), ([10, 300], 1), ([20, 524288], 1), ([20, 1000], 0)])),
  walk=('Build every row as a string and read position k of the last one: row n has 2ⁿ⁻¹ symbols, so O(2ⁿ) time and memory.',
        ['row 1 -> 0', 'parent = symbol (k + 1) // 2 of row n - 1 (the recursive call)',
         'k odd -> the same as the parent', 'k even -> the parent flipped (1 - parent)']),
  brute_code='def kthGrammar(n, k):\n    row = "0"\n    for _ in range(n - 1):   # build every row: the length doubles each time\n        row = "".join("01" if ch == "0" else "10" for ch in row)\n    return int(row[k - 1])')

_add(P('find_winner', 177, 'Find the Winner of the Circular Game', 'recursion', 'Medium',
  'n friends sit in a circle, numbered 1 to n clockwise. Starting from friend 1, count k friends clockwise, counting the friend you start on as 1. The friend you land on leaves the circle, and counting starts again from the next friend. Return the number of the last friend left.',
  'After one friend leaves, what remains is the same game with n - 1 friends, renumbered from the next friend. If the 0-indexed winner with m - 1 friends is w, the winner with m friends is (w + k) % m. With one friend, that friend wins.',
  'Mixing 1-indexed and 0-indexed positions. Solve it 0-indexed and add 1 at the very end.',
  'O(n)', 'O(n)',
  ['Does the friend you start on count as 1?', 'Are the friends numbered from 1?', 'Can k be larger than n?'],
  ['n = 1 -> 1', 'k = 1 -> n (friends leave in order)', 'k larger than n'],
  '''
def findTheWinner(n, k):
    def win(m):
        if m == 1:  # <<
            return 0
        return (win(m - 1) + k) % m  # <<
    return win(n) + 1  # <<
''',
  F('findTheWinner', [([5, 2], 3), ([6, 5], 1), ([1, 1], 1), ([4, 1], 4), ([3, 7], 3), ([10, 3], 4), ([7, 7], 5), ([50, 13], 5)])),
  walk=('Simulate the circle with a list and remove one friend per round: n rounds, each removal O(n), so O(n²).',
        ['one friend -> position 0 wins', 'winner of m friends = (winner of m - 1 friends + k) % m',
         'add 1 at the end to number friends from 1']),
  brute_code='def findTheWinner(n, k):\n    friends = list(range(1, n + 1))\n    i = 0\n    while len(friends) > 1:          # play the game out: n removals, each O(n)\n        i = (i + k - 1) % len(friends)\n        friends.pop(i)\n    return friends[0]')

# ── Prefix sums: a gentle first step before Product of Array Except Self ──
_add(P('pivot_index', 178, 'Find Pivot Index', 'prefix', 'Easy',
  'Given an integer array nums, return the leftmost index i where the sum of the values strictly to its left equals the sum of the values strictly to its right. The sum of no values is 0. Return -1 if there is no such index.',
  'The right side is total - left - nums[i]. Keep a running left sum as you walk, so each check is O(1).',
  'Add nums[i] to the left sum AFTER checking i, or i counts on its own left side. Return the first match, not the last.',
  'O(n)', 'O(1)',
  ['Can values be negative?', 'If several indices work, which one do I return?', 'Can the array be empty?'],
  ['pivot at index 0 (everything to the right sums to 0)', 'no pivot -> -1', 'one element -> 0', 'negative values'],
  '''
def pivotIndex(nums):
    total = sum(nums)
    left = 0
    for i, x in enumerate(nums):
        if left == total - left - x:  # <<
            return i
        left += x  # <<
    return -1
''',
  F('pivotIndex', [([[1, 7, 3, 6, 5, 6]], 3), ([[1, 2, 3]], -1), ([[2, 1, -1]], 0), ([[5]], 0), ([[]], -1),
                   ([[-1, -1, -1, -1, -1, 0]], 2), ([[0, 0, 0]], 0), ([[1, -1, 2]], 2)])),
  walk=('For each index, add up the left side and the right side from scratch: O(n²).',
        ['total = the sum of everything', 'left = 0', 'for each i: the right side is total - left - nums[i]; if it equals left, return i',
         '  then add nums[i] to left', 'no match -> return -1']),
  brute_code='def pivotIndex(nums):\n    for i in range(len(nums)):\n        if sum(nums[:i]) == sum(nums[i + 1:]):   # re-adds both sides every time\n            return i\n    return -1')

_add(P('range_sum_query', 179, 'Range Sum Query - Immutable', 'prefix', 'Easy',
  'Design a class NumArray. NumArray(nums) stores an integer array; sumRange(left, right) returns nums[left] + nums[left + 1] + ... + nums[right]. sumRange is called many times, so each call should be fast.',
  'Build the prefix sums once in the constructor; then every range sum is one subtraction: pre[right + 1] - pre[left].',
  'Off by one: with an extra 0 at the front, pre[i] is the sum of the first i values, so the range [left, right] is pre[right + 1] - pre[left].',
  'O(n) to build, O(1) per query', 'O(n)',
  ['How many queries, compared with the array length?', 'Are left and right inclusive and always valid?'],
  ['a range of one element', 'the whole array', 'negative values'],
  '''
class NumArray:
    def __init__(self, nums):
        self.pre = [0] * (len(nums) + 1)  # <<
        for i, x in enumerate(nums):
            self.pre[i + 1] = self.pre[i] + x  # <<

    def sumRange(self, left, right):
        return self.pre[right + 1] - self.pre[left]  # <<
''',
  D('NumArray', [(['NumArray', 'sumRange', 'sumRange', 'sumRange'], [[[-2, 0, 3, -5, 2, -1]], [0, 2], [2, 5], [0, 5]], [None, 1, -1, -3]),
                 (['NumArray', 'sumRange', 'sumRange'], [[[7]], [0, 0], [0, 0]], [None, 7, 7]),
                 (['NumArray', 'sumRange', 'sumRange', 'sumRange'], [[[1, 2, 3, 4]], [1, 2], [0, 3], [3, 3]], [None, 5, 10, 4])])),
  walk=('Keep the array and add up the range on every call: O(n) per query, so O(n·q) for q queries.',
        ['constructor: pre = [0] * (n + 1)', 'pre[i + 1] = pre[i] + nums[i] for each i',
         'sumRange(l, r) = pre[r + 1] - pre[l]']),
  brute_code='class NumArray:\n    def __init__(self, nums):\n        self.nums = nums\n\n    def sumRange(self, left, right):\n        return sum(self.nums[left:right + 1])   # re-adds the range on every call')

# ── Grid: an Easy flood fill before Number of Islands ──
_add(P('flood_fill', 180, 'Flood Fill', 'grid_graph', 'Easy',
  'An image is a grid of integers, one per pixel. Given a starting pixel (sr, sc) and a colour, recolour the starting pixel and every pixel connected to it up, down, left or right that has the same original colour as the starting pixel. Return the image.',
  'DFS from the starting pixel; recolouring a matching pixel as you visit it also marks it visited.',
  'If the new colour equals the old one, return at once: recoloured pixels would still match and the search would never end.',
  'O(rows·cols)', 'O(rows·cols)',
  ['Do diagonal neighbours count?', 'Can I change the input grid?', 'What if the new colour is the same as the old one?'],
  ['new colour == old colour', 'a single pixel', 'the whole image one colour'],
  '''
def floodFill(image, sr, sc, color):
    old = image[sr][sc]
    if old == color:  # <<
        return image
    ROWS, COLS = len(image), len(image[0])
    def dfs(r, c):
        if r < 0 or c < 0 or r >= ROWS or c >= COLS or image[r][c] != old:  # <<
            return
        image[r][c] = color  # <<
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            dfs(r + dr, c + dc)
    dfs(sr, sc)
    return image
''',
  F('floodFill', [([[[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2], [[2, 2, 2], [2, 2, 0], [2, 0, 1]]),
                  ([[[0, 0, 0], [0, 0, 0]], 0, 0, 0], [[0, 0, 0], [0, 0, 0]]),
                  ([[[5]], 0, 0, 3], [[3]]),
                  ([[[1, 2, 1]], 0, 0, 2], [[2, 2, 1]]),
                  ([[[0, 0, 0], [0, 1, 1]], 1, 1, 1], [[0, 0, 0], [0, 1, 1]]),
                  ([[[3, 3, 4], [4, 3, 3], [3, 4, 3]], 0, 0, 9], [[9, 9, 4], [4, 9, 9], [3, 4, 9]])])),
  walk=('Sweep the whole grid again and again, recolouring any matching pixel next to one already filled, until a sweep changes nothing: up to O((rows·cols)²).',
        ['old = colour of the start; if old == colour -> return the image', 'dfs(r, c): stop if off the grid or not the old colour',
         '  recolour (r, c), which also marks it visited', '  dfs the four neighbours', 'dfs(sr, sc) and return the image']),
  brute_code='def floodFill(image, sr, sc, color):\n    old = image[sr][sc]\n    if old == color:\n        return image\n    filled = {(sr, sc)}\n    changed = True\n    while changed:                     # sweep the whole grid until nothing changes\n        changed = False\n        for r in range(len(image)):\n            for c in range(len(image[0])):\n                if (r, c) not in filled and image[r][c] == old and any(\n                        (r + dr, c + dc) in filled for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1))):\n                    filled.add((r, c))\n                    changed = True\n    for r, c in filled:\n        image[r][c] = color\n    return image')
