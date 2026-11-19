"""Hidden large tests: the inputs LeetCode uses to reject slow solutions.

Each entry is (size label, generator source). The generator defines make(rng) and returns a list of
inputs: argument lists for functions, [ops, args] pairs for design classes. rng is random.Random
with a fixed seed, so every run sees the same inputs. Expected answers are not stored: the runner
computes them by running the reference solution on the same input.

validate.py checks two things for every entry:
  - the reference solution finishes all large tests quickly (so a correct optimal answer passes), and
  - the brute-force version shown in the Study walkthrough does NOT pass (so the test means something).
"""

PERF = {
# ── Arrays & hashing ──
"contains_duplicate": ("n = 60,000", '''
def make(rng):
    nums = rng.sample(range(10**9), 60000)
    return [[nums], [nums[:-1] + [nums[30000]]]]
'''),
"two_sum": ("n = 40,000", '''
def make(rng):
    # fillers are multiples of 4; the only pair summing to target (= 3 mod 4) is a + b
    nums = [4 * x for x in rng.sample(range(1, 10**8), 40000)]
    a, b = 4 * rng.randrange(10**7) + 1, 4 * rng.randrange(10**7) + 2
    i, j = 13000, 39000
    nums[i], nums[j] = a, b
    return [[nums, a + b]]
'''),
"group_anagrams": ("20,000 words", '''
def make(rng):
    letters = 'abcdefghijklmnopqrstuvwxyz'
    return [[[''.join(rng.choice(letters) for _ in range(8)) for _ in range(20000)]]]
'''),
"product_except_self": ("n = 40,000", '''
def make(rng):
    nums = [1] * 40000
    for k in rng.sample(range(40000), 25):
        nums[k] = rng.choice([-1, 2, 3])
    return [[nums]]
'''),
# ── Two pointers ──
"two_sum_ii": ("n = 40,000", '''
def make(rng):
    nums = [4 * x for x in rng.sample(range(1, 10**8), 39998)]
    # the pair sits at the very end of the sorted array, where a scan from the left reaches it last
    a, b = 4 * (10**8 + rng.randrange(1000)) + 1, 4 * (10**8 + 2000 + rng.randrange(1000)) + 2
    nums = sorted(nums + [a, b])
    return [[nums, a + b]]
'''),
"three_sum": ("n = 1,200", '''
def make(rng):
    return [[[rng.randint(-50000, 50000) for _ in range(1200)]]]
'''),
"container_water": ("n = 60,000", '''
def make(rng):
    return [[[rng.randint(0, 10**4) for _ in range(60000)]]]
'''),
"trapping_rain": ("n = 80,000", '''
def make(rng):
    return [[[rng.randint(0, 10**4) for _ in range(80000)]]]
'''),
# ── Sliding window ──
"best_time_stock": ("n = 50,000", '''
def make(rng):
    return [[[rng.randint(0, 10**4) for _ in range(50000)]]]
'''),
"longest_substring": ("n = 20,000", '''
def make(rng):
    return [[''.join(rng.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(20000))]]
'''),
"char_replacement": ("n = 20,000", '''
def make(rng):
    return [[''.join(rng.choice('ABCDE') for _ in range(20000)), 50]]
'''),
"permutation_in_string": ("|s1| = 3,000, |s2| = 40,000", '''
def make(rng):
    letters = 'abcdefghijklmnopqrstuvwxyz'
    s1 = ''.join(rng.choice(letters) for _ in range(3000))
    s2 = ''.join(rng.choice(letters) for _ in range(40000))
    return [[s1, s2]]
'''),
"min_window": ("|s| = 50,000", '''
def make(rng):
    s = [rng.choice('abcdefghijklmnopqrstuvwx') for _ in range(50000)]
    s[20000], s[20004] = 'y', 'z'     # the only window containing both
    return [[''.join(s), 'zy']]
'''),
"sliding_window_max": ("n = 100,000, k = 30,000", '''
def make(rng):
    return [[[rng.randint(-10**4, 10**4) for _ in range(100000)], 30000]]
'''),
# ── Stack ──
"valid_parentheses": ("n = 400,000", '''
def make(rng):
    return [['(' * 200000 + ')' * 200000], ['([{' * 60000 + '}])' * 60000 + ']']]
'''),
"min_stack": ("100,000 operations", '''
def make(rng):
    ops, args = ['MinStack'], [[]]
    for _ in range(50000):
        ops.append('push'); args.append([rng.randint(-10**9, 10**9)])
    for _ in range(50000):
        ops.append('getMin'); args.append([])
    return [[ops, args]]
'''),
"daily_temperatures": ("n = 50,000", '''
def make(rng):
    return [[list(range(100000, 50000, -1))]]
'''),
"largest_rectangle": ("n = 50,000", '''
def make(rng):
    return [[[7] * 50000]]
'''),
# ── Binary search ──
"koko": ("10,000 piles up to 10^9", '''
def make(rng):
    piles = [rng.randint(5 * 10**8, 10**9) for _ in range(10000)]
    return [[piles, 20000]]
'''),
"time_map": ("60,000 operations", '''
def make(rng):
    ops, args = ['TimeMap'], [[]]
    for t in range(1, 30001):
        ops.append('set'); args.append(['k', 'v%d' % t, 2 * t])
    for _ in range(30000):
        ops.append('get'); args.append(['k', rng.randint(1, 60001)])
    return [[ops, args]]
'''),
# ── Linked list / heap ──
"merge_k_lists": ("2,000 lists, 100,000 nodes", '''
def make(rng):
    return [[[sorted(rng.randint(-10**6, 10**6) for _ in range(50)) for _ in range(2000)]]]
'''),
"kth_largest_stream": ("20,000 adds", '''
def make(rng):
    ops, args = ['KthLargest'], [[100, [rng.randint(-10**4, 10**4) for _ in range(1000)]]]
    for _ in range(20000):
        ops.append('add'); args.append([rng.randint(-10**4, 10**4)])
    return [[ops, args]]
'''),
"last_stone": ("n = 300,000", '''
def make(rng):
    return [[[rng.randint(1, 10**6) for _ in range(300000)]]]
'''),
# ── Trie / design ──
"implement_trie": ("40,000 operations", '''
def make(rng):
    ops, args = ['Trie'], [[]]
    for _ in range(20000):
        ops.append('insert'); args.append([''.join(rng.choice('abcde') for _ in range(10))])
    for _ in range(20000):
        ops.append('startsWith'); args.append([''.join(rng.choice('abcdef') for _ in range(6))])
    return [[ops, args]]
'''),
"detect_squares": ("6,000 operations", '''
def make(rng):
    ops, args = ['DetectSquares'], [[]]
    for _ in range(3000):
        ops.append('add'); args.append([[rng.randint(0, 40), rng.randint(0, 40)]])
    for _ in range(3000):
        ops.append('count'); args.append([[rng.randint(0, 40), rng.randint(0, 40)]])
    return [[ops, args]]
'''),
# ── Graphs ──
"course_schedule": ("3,000 courses in a chain", '''
def make(rng):
    pre = [[i, i + 1] for i in range(2999)]
    rng.shuffle(pre)
    return [[3000, pre]]
'''),
"graph_valid_tree": ("n = 20,000", '''
def make(rng):
    # a path given in order: each new edge extends the same long component
    return [[20000, [[i, i + 1] for i in range(19999)]]]
'''),
"min_cost_connect": ("600 points", '''
def make(rng):
    return [[[[rng.randint(-10**6, 10**6), rng.randint(-10**6, 10**6)] for _ in range(600)]]]
'''),
# ── 1-D DP ──
"climbing_stairs": ("n = 40", '''
def make(rng):
    return [[40]]
'''),
"min_cost_stairs": ("40 stairs", '''
def make(rng):
    return [[[rng.randint(0, 999) for _ in range(40)]]]
'''),
"house_robber": ("40 houses", '''
def make(rng):
    return [[[rng.randint(0, 400) for _ in range(40)]]]
'''),
"house_robber_ii": ("40 houses", '''
def make(rng):
    return [[[rng.randint(0, 400) for _ in range(40)]]]
'''),
"palindromic_substrings": ("n = 6,000", '''
def make(rng):
    return [[''.join(rng.choice('ab') for _ in range(6000))]]
'''),
"decode_ways": ("n = 45", '''
def make(rng):
    return [['1' * 45]]
'''),
"coin_change": ("amount = 10,000", '''
def make(rng):
    return [[[3, 7, 11, 29], 10000]]
'''),
"max_product_subarray": ("n = 20,000", '''
def make(rng):
    nums = [rng.choice([-2, -1, 1, 2]) for _ in range(20000)]
    for k in range(0, 20000, 20):
        nums[k] = 0
    return [[nums]]
'''),
"word_break": ("n = 41", '''
def make(rng):
    return [['a' * 40 + 'b', ['a', 'aa', 'aaa', 'aaaa', 'aaaaa']]]
'''),
"lis": ("n = 40", '''
def make(rng):
    return [[list(range(40))]]
'''),
"partition_equal_subset": ("n = 40", '''
def make(rng):
    return [[[2] * 39 + [4]]]
'''),
# ── 2-D DP ──
"unique_paths": ("17 x 17", '''
def make(rng):
    return [[17, 17]]
'''),
"lcs": ("length 22 each", '''
def make(rng):
    return [['ab' * 11, 'cd' * 11]]
'''),
"stock_cooldown": ("40 days", '''
def make(rng):
    return [[[rng.randint(0, 1000) for _ in range(40)]]]
'''),
"coin_change_ii": ("amount = 600", '''
def make(rng):
    return [[600, [1, 2, 5, 10, 20, 50]]]
'''),
"target_sum": ("n = 28", '''
def make(rng):
    return [[[1] * 28, 2]]
'''),
"interleaving_string": ("length 30", '''
def make(rng):
    return [['a' * 14 + 'b', 'a' * 15, 'a' * 30]]
'''),
"longest_increasing_path": ("14 x 14", '''
def make(rng):
    return [[[[i + j for j in range(14)] for i in range(14)]]]
'''),
"distinct_subsequences": ("|s| = 30", '''
def make(rng):
    return [['a' * 30, 'a' * 15]]
'''),
"edit_distance": ("length 14 each", '''
def make(rng):
    return [['ab' * 7, 'cd' * 7]]
'''),
"burst_balloons": ("n = 60", '''
def make(rng):
    return [[[rng.randint(1, 100) for _ in range(60)]]]
'''),
"regex_matching": ("length 22", '''
def make(rng):
    return [['a' * 22, 'a*' * 11 + 'b']]
'''),
# ── Greedy ──
"max_subarray": ("n = 40,000", '''
def make(rng):
    return [[[rng.randint(-10**4, 10**4) for _ in range(40000)]]]
'''),
"jump_game": ("n = 40,000", '''
def make(rng):
    return [[[40000] * 40000]]
'''),
"jump_game_ii": ("n = 20,000", '''
def make(rng):
    return [[[20000] * 20000]]
'''),
"gas_station": ("n = 20,000", '''
def make(rng):
    n = 20000
    gas, cost = [1] * n, [1] * n
    gas[n - 1], gas[n - 2] = 2, 0      # the only start that works is the last station
    return [[gas, cost]]
'''),
"hand_of_straights": ("n = 160,000", '''
def make(rng):
    hand = [0] * 80000 + [1] * 80000
    rng.shuffle(hand)
    return [[hand, 2]]
'''),
"partition_labels": ("n = 60,000", '''
def make(rng):
    return [[''.join(rng.choice('abcdefghij') for _ in range(30000)) + ''.join(rng.choice('klmnopqrst') for _ in range(30000))]]
'''),
"valid_parenthesis_string": ("n = 39", '''
def make(rng):
    return [['(' * 20 + '*' * 19]]
'''),
# ── Intervals ──
"meeting_rooms": ("30,000 meetings", '''
def make(rng):
    iv = [[2 * i, 2 * i + 1] for i in range(30000)]
    rng.shuffle(iv)
    return [[iv]]
'''),
"meeting_rooms_ii": ("20,000 meetings", '''
def make(rng):
    iv = []
    for _ in range(20000):
        s = rng.randint(0, 10**6)
        iv.append([s, s + rng.randint(1, 5000)])
    return [[iv]]
'''),
"min_interval_query": ("20,000 intervals, 20,000 queries", '''
def make(rng):
    iv = []
    for _ in range(20000):
        a = rng.randint(1, 10**6)
        iv.append([a, a + rng.randint(0, 5000)])
    return [[iv, [rng.randint(1, 10**6) for _ in range(20000)]]]
'''),
# ── Math ──
"pow_x_n": ("n = 2^31 - 1", '''
def make(rng):
    return [[1.000000001, 2**31 - 1], [1.000000001, -(2**31)]]
'''),
}
