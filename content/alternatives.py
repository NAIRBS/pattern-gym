"""Other valid ways to solve a problem, besides its reference solution.

Interviews reward seeing more than one approach and saying the trade-off. Each entry is shown in the
walkthrough's "Another way?" step, and an alternative with a `pattern` also counts as a right answer
wherever the app asks "which pattern?" (Pattern Sprint, the guided problems).

Fields:
  pattern  the pattern id this approach uses, or None when it isn't one of the 24 (sorting, plain math...)
  name     a short name for the approach
  how      one or two sentences: the idea
  time, space
  when     the trade-off against the reference: when you'd pick it, and why the reference is usually preferred
  code     a full solution (same function or class name as the reference); validate.py runs it against the tests
"""


def alt(pattern, name, how, time, space, when, code=None):
    return {"pattern": pattern, "name": name, "how": how, "time": time, "space": space, "when": when,
            "code": code.strip("\n") if code else None}


ALTERNATIVES = {
# ── Hash map ──────────────────────────────────────────────────────────────────────────────────────────
"contains_duplicate": [alt(None, "Sort, then compare neighbours",
    "After sorting, equal values sit next to each other, so one pass comparing neighbours finds a repeat.",
    "O(n log n)", "O(1) extra if you may sort in place",
    "Pick it when memory is tight and you're allowed to reorder the input. The set is faster and doesn't touch the input.", """
def containsDuplicate(nums):
    nums = sorted(nums)
    for i in range(1, len(nums)):
        if nums[i] == nums[i - 1]:
            return True
    return False
""")],
"valid_anagram": [alt(None, "Sort both strings",
    "Two strings are anagrams exactly when their sorted letters are equal.",
    "O(n log n)", "O(n)",
    "The one-liner to say first. Counting letters is the O(n) answer if they ask for faster.", """
def isAnagram(s, t):
    return sorted(s) == sorted(t)
""")],
"two_sum": [alt("two_pointers", "Sort the indices, then two pointers",
    "Sort the indices by value, then move a pointer in from each end: too small, move the left one up; too big, move the right one down.",
    "O(n log n)", "O(n)",
    "Slower here, because you must sort and still return the original indices. If the input is already sorted (Two Sum II), it's the better answer: O(n) time and O(1) space.", """
def twoSum(nums, target):
    idx = sorted(range(len(nums)), key=lambda i: nums[i])
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[idx[l]] + nums[idx[r]]
        if s == target:
            return sorted([idx[l], idx[r]])
        if s < target:
            l += 1
        else:
            r -= 1
""")],
"group_anagrams": [alt(None, "Sorted word as the key",
    "Anagrams have the same sorted letters, so ''.join(sorted(word)) is a key they all share.",
    "O(n·k log k)", "O(n·k)",
    "What most people write first, and shorter. The letter-count key saves the log k, which only matters for long words.", """
def groupAnagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        groups[''.join(sorted(s))].append(s)
    return list(groups.values())
""")],
"top_k_frequent": [alt("heap", "Count, then a heap of size k",
    "Count with Counter, then keep the k most frequent with a heap (heapq.nlargest does exactly that).",
    "O(n log k)", "O(n)",
    "The answer most interviewers expect first. Bucket counting (the reference here) is the O(n) follow-up.", """
def topKFrequent(nums, k):
    count = Counter(nums)
    return heapq.nlargest(k, count, key=count.get)
""")],
"longest_consecutive": [
  alt(None, "Sort, then count runs",
    "Sort the distinct values and walk them, extending the run while each value is one more than the last.",
    "O(n log n)", "O(n)",
    "Easier to get right. The problem asks for O(n), so say this one first, then improve it with the set.", """
def longestConsecutive(nums):
    if not nums:
        return 0
    vals = sorted(set(nums))
    best = cur = 1
    for i in range(1, len(vals)):
        cur = cur + 1 if vals[i] == vals[i - 1] + 1 else 1
        best = max(best, cur)
    return best
"""),
  alt("union_find", "Union each number with its neighbours",
    "Union x with x - 1 and x + 1 when they're present; the largest group is the longest run.",
    "O(n·α(n))", "O(n)",
    "Correct and good union-find practice, but more code than the set walk for the same result.", """
def longestConsecutive(nums):
    parent, size = {}, {}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for x in nums:
        if x in parent:
            continue
        parent[x], size[x] = x, 1
        for y in (x - 1, x + 1):
            if y in parent:
                a, b = find(x), find(y)
                if a != b:
                    if size[a] < size[b]:
                        a, b = b, a
                    parent[b] = a
                    size[a] += size[b]
    return max((size[find(x)] for x in parent), default=0)
""")],

# ── Two pointers ──────────────────────────────────────────────────────────────────────────────────────
"valid_palindrome": [alt(None, "Clean it, then compare with its reverse",
    "Keep only the letters and digits, lowercased, and check the result equals its reverse.",
    "O(n)", "O(n)",
    "Shortest to write. Two pointers avoids building the copy, which is the point if they ask for O(1) space.", """
def isPalindrome(s):
    t = [c.lower() for c in s if c.isalnum()]
    return t == t[::-1]
""")],
"two_sum_ii": [alt("binary_search", "Binary search for each partner",
    "For each number x, binary search the rest of the sorted array for target - x.",
    "O(n log n)", "O(1)",
    "Correct, and a natural first idea on sorted input. Two pointers uses the sorting better: O(n).", """
def twoSum(numbers, target):
    import bisect
    for i, x in enumerate(numbers):
        j = bisect.bisect_left(numbers, target - x, i + 1)
        if j < len(numbers) and numbers[j] == target - x:
            return [i + 1, j + 1]
""")],
"three_sum": [alt("hashmap", "Fix one number, then Two Sum with a set",
    "For each i, run the hash-set Two Sum on the numbers after it, looking for -nums[i].",
    "O(n²)", "O(n)",
    "Same time, but you need a set of tuples to drop duplicate triplets. Sorting plus two pointers skips duplicates for free and uses O(1) extra space.", """
def threeSum(nums):
    nums = sorted(nums)
    res = set()
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        seen = set()
        for x in nums[i + 1:]:
            need = -nums[i] - x
            if need in seen:
                res.add((nums[i], need, x))
            seen.add(x)
    return [list(t) for t in res]
""")],
"trapping_rain": [
  alt("prefix", "Tallest bar to the left and to the right",
    "Precompute the tallest bar up to each index from the left and from the right; the water above a bar is min(left, right) - height.",
    "O(n)", "O(n)",
    "The easiest version to get right, so a good first answer. Two pointers then removes the two arrays for O(1) space.", """
def trap(height):
    n = len(height)
    if n == 0:
        return 0
    left, right = [0] * n, [0] * n
    left[0] = height[0]
    for i in range(1, n):
        left[i] = max(left[i - 1], height[i])
    right[-1] = height[-1]
    for i in range(n - 2, -1, -1):
        right[i] = max(right[i + 1], height[i])
    return sum(min(left[i], right[i]) - height[i] for i in range(n))
"""),
  alt("mono_stack", "Fill the water in layers with a stack",
    "Keep a stack of bars with decreasing heights. A taller bar closes a basin: pop the bottom and add the water above it, between the new top and the current bar.",
    "O(n)", "O(n)",
    "Good monotonic-stack practice, and it works layer by layer instead of column by column. Rarely the first idea in an interview.", """
def trap(height):
    stack, water = [], 0
    for i, h in enumerate(height):
        while stack and height[stack[-1]] < h:
            bottom = stack.pop()
            if not stack:
                break
            left = stack[-1]
            water += (min(height[left], h) - height[bottom]) * (i - left - 1)
        stack.append(i)
    return water
""")],

# ── Sliding window / monotonic stack ──────────────────────────────────────────────────────────────────
"sliding_window_max": [alt("heap", "Max-heap with lazy removal",
    "Push (-value, index); before reading the top, pop entries whose index has left the window.",
    "O(n log n)", "O(n)",
    "Easier to come up with under pressure. The monotonic deque is the O(n) answer interviewers look for.", """
def maxSlidingWindow(nums, k):
    heap, res = [], []
    for i, x in enumerate(nums):
        heapq.heappush(heap, (-x, i))
        while heap[0][1] <= i - k:
            heapq.heappop(heap)
        if i >= k - 1:
            res.append(-heap[0][0])
    return res
""")],

# ── Binary search ─────────────────────────────────────────────────────────────────────────────────────
"median_two_sorted": [alt("two_pointers", "Merge up to the middle",
    "Walk both arrays with a pointer each, as in a merge, and stop once you've passed the middle element(s).",
    "O(m + n)", "O(1)",
    "A solid fallback if the binary search won't come: it's correct, and you can name the O(log(min(m, n))) version as the improvement.", """
def findMedianSortedArrays(nums1, nums2):
    total = len(nums1) + len(nums2)
    i = j = 0
    prev = cur = 0
    for _ in range(total // 2 + 1):
        prev = cur
        if j >= len(nums2) or (i < len(nums1) and nums1[i] <= nums2[j]):
            cur = nums1[i]
            i += 1
        else:
            cur = nums2[j]
            j += 1
    return float(cur) if total % 2 else (prev + cur) / 2
""")],
"search_2d_matrix": [alt(None, "Staircase walk from the top-right corner",
    "Start at the top-right. Too big: move left. Too small: move down. Each step rules out a row or a column.",
    "O(m + n)", "O(1)",
    "Slower here, but it still works when only each row and each column is sorted (Search a 2D Matrix II), where treating the matrix as one sorted list doesn't.", """
def searchMatrix(matrix, target):
    r, c = 0, len(matrix[0]) - 1
    while r < len(matrix) and c >= 0:
        v = matrix[r][c]
        if v == target:
            return True
        if v > target:
            c -= 1
        else:
            r += 1
    return False
""")],

# ── Linked list ───────────────────────────────────────────────────────────────────────────────────────
"linked_list_cycle": [alt("hashmap", "Remember the nodes you've visited",
    "Walk the list and keep every node in a set; reaching a node already in the set means a cycle.",
    "O(n)", "O(n)",
    "The obvious first answer. Fast and slow pointers is the O(1)-space follow-up interviewers ask for.", """
def hasCycle(head):
    seen = set()
    while head:
        if id(head) in seen:
            return True
        seen.add(id(head))
        head = head.next
    return False
""")],
"find_duplicate": [alt("binary_search", "Binary search on the value",
    "For a guess mid, count the numbers <= mid. More than mid of them means the duplicate is <= mid (pigeonhole).",
    "O(n log n)", "O(1)",
    "Easier to explain than Floyd's cycle trick and still meets 'no extra space, don't modify the array'. Floyd's is O(n).", """
def findDuplicate(nums):
    lo, hi = 1, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if sum(x <= mid for x in nums) > mid:
            hi = mid
        else:
            lo = mid + 1
    return lo
""")],
"reorder_list": [alt(None, "Copy the nodes into an array",
    "Put the nodes in a Python list, then relink them by taking from the front and the back in turn.",
    "O(n)", "O(n)",
    "Much less pointer juggling, so fewer bugs. Splitting, reversing and merging in place is the O(1)-space answer.", """
def reorderList(head):
    nodes = []
    while head:
        nodes.append(head)
        head = head.next
    l, r = 0, len(nodes) - 1
    while l < r:
        nodes[l].next = nodes[r]
        l += 1
        if l == r:
            break
        nodes[r].next = nodes[l]
        r -= 1
    if nodes:
        nodes[l].next = None
""")],
"reverse_list": [alt("recursion", "Reverse the rest, then hook the head on the end",
    "Recursively reverse everything after the head; the old second node is now the tail, so point it back at the head.",
    "O(n)", "O(n) call stack",
    "Short and a good recursion exercise. Each node is a stack frame, so Python fails past about 1,000 nodes; the loop is safer.", """
def reverseList(head):
    if not head or not head.next:
        return head
    new_head = reverseList(head.next)
    head.next.next = head
    head.next = None
    return new_head
""")],
"merge_two": [alt("recursion", "Recursive merge",
    "The smaller head comes first, followed by the merge of everything else.",
    "O(n + m)", "O(n + m) call stack",
    "Very short, but one stack frame per node. The loop with a dummy head is O(1) space and can't hit the recursion limit.", """
def mergeTwoLists(list1, list2):
    if not list1 or not list2:
        return list1 or list2
    if list1.val <= list2.val:
        list1.next = mergeTwoLists(list1.next, list2)
        return list1
    list2.next = mergeTwoLists(list1, list2.next)
    return list2
""")],
"remove_nth": [alt(None, "Two passes: count, then remove",
    "Count the length L, then walk to the node just before position L - n and unlink the next one.",
    "O(n)", "O(1)",
    "Same cost and easier to get right. The gap of n between two pointers is what the 'in one pass' follow-up asks for.", """
def removeNthFromEnd(head, n):
    length, node = 0, head
    while node:
        length += 1
        node = node.next
    dummy = ListNode(0, head)
    prev = dummy
    for _ in range(length - n):
        prev = prev.next
    prev.next = prev.next.next
    return dummy.next
""")],
"lru_cache": [alt("linked_list", "Hash map plus a hand-built doubly linked list",
    "A dict maps each key to its node; the list keeps nodes from most to least recently used, so moving and evicting are O(1).",
    "O(1) per call", "O(capacity)",
    "What the interviewer means by 'without OrderedDict'. Ask which they want before you start: OrderedDict is fine in many interviews.", """
class _Node:
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.map = {}
        self.head, self.tail = _Node(), _Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _add_front(self, node):
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)
        self._add_front(node)
        return node.val

    def put(self, key, value):
        if key in self.map:
            self._remove(self.map[key])
        node = _Node(key, value)
        self.map[key] = node
        self._add_front(node)
        if len(self.map) > self.cap:
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]
""")],

# ── Heap ──────────────────────────────────────────────────────────────────────────────────────────────
"kth_largest_array": [
  alt(None, "Sort",
    "Sort and take the k-th from the end.",
    "O(n log n)", "O(n)",
    "One line, and often fine. Say it, then offer the heap when they ask to beat n log n for small k.", """
def findKthLargest(nums, k):
    return sorted(nums)[-k]
"""),
  alt(None, "Quickselect",
    "Partition around a random pivot like quicksort, then continue only into the part that holds the k-th largest.",
    "O(n) average, O(n²) worst", "O(n)",
    "Faster on average and a known follow-up. The heap is safer to code in 25 minutes and has no bad worst case.", """
def findKthLargest(nums, k):
    import random
    pivot = random.choice(nums)
    bigger = [x for x in nums if x > pivot]
    equal = [x for x in nums if x == pivot]
    smaller = [x for x in nums if x < pivot]
    if k <= len(bigger):
        return findKthLargest(bigger, k)
    if k <= len(bigger) + len(equal):
        return pivot
    return findKthLargest(smaller, k - len(bigger) - len(equal))
""")],
"k_closest": [alt(None, "Sort by distance",
    "Sort the points by x² + y² and take the first k.",
    "O(n log n)", "O(n)",
    "One line and fine unless k is much smaller than n and they ask you to beat n log n; then the size-k heap.", """
def kClosest(points, k):
    return sorted(points, key=lambda p: p[0] * p[0] + p[1] * p[1])[:k]
""")],
"merge_k_lists": [alt(None, "Merge the lists in pairs",
    "Merge lists two at a time, round after round, like merge sort: each round halves the number of lists.",
    "O(N log k)", "O(1) extra",
    "Same cost with no heap, and it reuses Merge Two Sorted Lists, which you may have just written.", """
def mergeKLists(lists):
    def merge(a, b):
        dummy = tail = ListNode()
        while a and b:
            if a.val <= b.val:
                tail.next, a = a, a.next
            else:
                tail.next, b = b, b.next
            tail = tail.next
        tail.next = a or b
        return dummy.next
    lists = [l for l in lists if l]
    if not lists:
        return None
    while len(lists) > 1:
        lists = [merge(lists[i], lists[i + 1] if i + 1 < len(lists) else None) for i in range(0, len(lists), 2)]
    return lists[0]
""")],
"meeting_rooms_ii": [alt("intervals", "Sweep sorted starts and ends",
    "Sort the start times and the end times separately. Walk the starts: if the earliest unused end hasn't come yet, you need another room; otherwise a room frees up.",
    "O(n log n)", "O(n)",
    "No heap needed: it counts meetings started minus meetings ended. A good way to show you see the problem two ways.", """
def minMeetingRooms(intervals):
    starts = sorted(s for s, _ in intervals)
    ends = sorted(e for _, e in intervals)
    rooms = e = 0
    for s in starts:
        if s < ends[e]:
            rooms += 1
        else:
            e += 1
    return rooms
""")],
"task_scheduler": [alt("heap", "Simulate with a max-heap and a cooldown queue",
    "Each time slot, run the task with the most left (max-heap), then park it in a queue until its cooldown ends.",
    "O(t log 26), t = the answer", "O(1) (26 letters)",
    "Easier to discover and explain than the formula, and it works if they change the rules. The counting formula (the reference) is the shortcut once you see it.", """
def leastInterval(tasks, n):
    heap = [-c for c in Counter(tasks).values()]
    heapq.heapify(heap)
    wait = deque()
    time = 0
    while heap or wait:
        time += 1
        if heap:
            left = heapq.heappop(heap) + 1
            if left:
                wait.append((left, time + n))
        if wait and wait[0][1] == time:
            heapq.heappush(heap, wait.popleft()[0])
    return time
""")],
"median_finder": [alt(None, "Keep one sorted list",
    "Insert each number in order with bisect.insort; the median is the middle of the list.",
    "O(n) per add, O(1) per median", "O(n)",
    "Simple and quick for small inputs, but every insert shifts the list. Two heaps make each add O(log n).", """
import bisect

class MedianFinder:
    def __init__(self):
        self.a = []

    def addNum(self, num):
        bisect.insort(self.a, num)

    def findMedian(self):
        n = len(self.a)
        return float(self.a[n // 2]) if n % 2 else (self.a[n // 2 - 1] + self.a[n // 2]) / 2
""")],
"top_k_words": [alt(None, "Sort by (-count, word)",
    "Count, then sort the distinct words by count descending and alphabetically within a count, and take k.",
    "O(n log n)", "O(n)",
    "Shortest, and the tie-break is just the sort key. The heap is the answer if they ask for better than n log n.", """
def topKWords(words, k):
    count = Counter(words)
    return sorted(count, key=lambda w: (-count[w], w))[:k]
""")],

# ── Trees ─────────────────────────────────────────────────────────────────────────────────────────────
"max_depth": [alt("tree_bfs", "Count the levels with BFS",
    "Walk the tree level by level with a queue and count the levels.",
    "O(n)", "O(width)",
    "No recursion, so no depth limit on a very deep, one-sided tree, which matters in Python.", """
def maxDepth(root):
    q = deque([root] if root else [])
    depth = 0
    while q:
        depth += 1
        for _ in range(len(q)):
            node = q.popleft()
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
    return depth
""")],
"invert_tree": [alt("tree_bfs", "Swap children level by level",
    "Visit every node with a queue and swap its two children.",
    "O(n)", "O(width)",
    "Same work without recursion; useful when the tree may be very deep.", """
def invertTree(root):
    q = deque([root] if root else [])
    while q:
        node = q.popleft()
        node.left, node.right = node.right, node.left
        if node.left:
            q.append(node.left)
        if node.right:
            q.append(node.right)
    return root
""")],
"validate_bst": [alt(None, "In-order traversal must be increasing",
    "An in-order walk of a BST visits values in sorted order, so check each value is bigger than the one before.",
    "O(n)", "O(h)",
    "Uses the one fact that defines a BST. Some find it easier to trust than passing low and high bounds down.", """
def isValidBST(root):
    prev = float('-inf')
    stack, node = [], root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        if node.val <= prev:
            return False
        prev = node.val
        node = node.right
    return True
""")],
"kth_smallest_bst": [alt("tree_dfs", "Recursive in-order into a list",
    "Collect all values with an in-order DFS (they come out sorted) and take the k-th.",
    "O(n)", "O(n)",
    "The simplest version. The iterative walk (the reference) stops after k nodes instead of visiting all of them.", """
def kthSmallest(root, k):
    vals = []
    def inorder(node):
        if node:
            inorder(node.left)
            vals.append(node.val)
            inorder(node.right)
    inorder(root)
    return vals[k - 1]
""")],
"right_side_view": [alt("tree_dfs", "DFS that visits the right child first",
    "Go right before left, carrying the depth. The first node you meet at each new depth is the one visible from the right.",
    "O(n)", "O(h)",
    "Less memory on wide trees, and a nice trick to know. BFS reads more naturally for a 'per level' question.", """
def rightSideView(root):
    res = []
    def dfs(node, depth):
        if not node:
            return
        if depth == len(res):
            res.append(node.val)
        dfs(node.right, depth + 1)
        dfs(node.left, depth + 1)
    dfs(root, 0)
    return res
""")],
"level_order": [alt("tree_dfs", "DFS that carries the depth",
    "Pass the depth down; append each value to the list for its depth.",
    "O(n)", "O(h)",
    "Works because the order within each level is still left to right. BFS is the natural fit; this shows depth is all you need.", """
def levelOrder(root):
    res = []
    def dfs(node, depth):
        if not node:
            return
        if depth == len(res):
            res.append([])
        res[depth].append(node.val)
        dfs(node.left, depth + 1)
        dfs(node.right, depth + 1)
    dfs(root, 0)
    return res
""")],
"serialize_tree": [alt("tree_bfs", "Level order with null markers",
    "Write nodes level by level, with a marker for each missing child; rebuild by reading children in the same order with a queue.",
    "O(n)", "O(n)",
    "The same format LeetCode uses to print trees. Pre-order DFS (the reference) is shorter to write.", """
class Codec:
    def serialize(self, root):
        out, q = [], deque([root])
        while q:
            node = q.popleft()
            if node:
                out.append(str(node.val))
                q.append(node.left)
                q.append(node.right)
            else:
                out.append('N')
        return ','.join(out)

    def deserialize(self, data):
        vals = data.split(',')
        if vals[0] == 'N':
            return None
        root = TreeNode(int(vals[0]))
        q, i = deque([root]), 1
        while q:
            node = q.popleft()
            if vals[i] != 'N':
                node.left = TreeNode(int(vals[i]))
                q.append(node.left)
            i += 1
            if vals[i] != 'N':
                node.right = TreeNode(int(vals[i]))
                q.append(node.right)
            i += 1
        return root
""")],

# ── Graphs ────────────────────────────────────────────────────────────────────────────────────────────
"num_islands": [
  alt(None, "BFS with a queue instead of DFS",
    "Same flood fill, but spread from each new island with a queue.",
    "O(m·n)", "O(min(m, n)) queue",
    "Same cost and no recursion: a recursive DFS can hit Python's depth limit on a large all-land grid.", """
def numIslands(grid):
    R, C = len(grid), len(grid[0])
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == '1':
                count += 1
                grid[r][c] = '0'
                q = deque([(r, c)])
                while q:
                    cr, cc = q.popleft()
                    for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                        if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == '1':
                            grid[nr][nc] = '0'
                            q.append((nr, nc))
    return count
"""),
  alt("union_find", "Union neighbouring land cells",
    "Give each land cell its own group, union it with land above and to the left, and count the groups left.",
    "O(m·n·α)", "O(m·n)",
    "Shines when land is added one cell at a time (Number of Islands II). For a fixed grid, the flood fill is less code.", """
def numIslands(grid):
    R, C = len(grid), len(grid[0])
    parent = {}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == '1':
                parent[(r, c)] = (r, c)
                count += 1
                for nb in ((r - 1, c), (r, c - 1)):
                    if nb in parent:
                        a, b = find((r, c)), find(nb)
                        if a != b:
                            parent[a] = b
                            count -= 1
    return count
""")],
"count_components": [alt("grid_graph", "DFS from each unvisited node",
    "Build an adjacency list; every time you start a search from a node not yet seen, that's a new component.",
    "O(V + E)", "O(V + E)",
    "Just as good for a fixed edge list. Union-find wins when edges arrive one at a time.", """
def countComponents(n, edges):
    adj = defaultdict(list)
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    seen, count = set(), 0
    for i in range(n):
        if i in seen:
            continue
        count += 1
        seen.add(i)
        stack = [i]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
    return count
""")],
"graph_valid_tree": [alt("grid_graph", "Edge count, then one DFS",
    "A tree on n nodes has exactly n - 1 edges and is connected, so check the count and that a DFS from node 0 reaches every node.",
    "O(V + E)", "O(V + E)",
    "Equally standard. Union-find (the reference) finds the cycle edge directly, which helps in Redundant Connection.", """
def validTree(n, edges):
    if len(edges) != n - 1:
        return False
    adj = defaultdict(list)
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    seen, stack = {0}, [0]
    while stack:
        for v in adj[stack.pop()]:
            if v not in seen:
                seen.add(v)
                stack.append(v)
    return len(seen) == n
""")],
"redundant_connection": [alt("grid_graph", "Check each edge with a DFS",
    "Before adding an edge, search the graph built so far: if its two ends are already connected, this edge makes the cycle.",
    "O(n²)", "O(n)",
    "The idea is easy to explain. Union-find makes each check nearly O(1).", """
def findRedundantConnection(edges):
    adj = defaultdict(set)
    def connected(a, b):
        seen, stack = {a}, [a]
        while stack:
            u = stack.pop()
            if u == b:
                return True
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
        return False
    for a, b in edges:
        if connected(a, b):
            return [a, b]
        adj[a].add(b)
        adj[b].add(a)
""")],
"count_provinces": [alt("grid_graph", "DFS over the adjacency matrix",
    "Start a search from every city not yet visited; each start is a new province.",
    "O(n²)", "O(n)",
    "Same cost; the matrix is already the graph. Union-find is the same count from the other side.", """
def findCircleNum(isConnected):
    n = len(isConnected)
    seen, count = set(), 0
    for i in range(n):
        if i in seen:
            continue
        count += 1
        seen.add(i)
        stack = [i]
        while stack:
            u = stack.pop()
            for v in range(n):
                if isConnected[u][v] and v not in seen:
                    seen.add(v)
                    stack.append(v)
    return count
""")],
"course_schedule": [alt("grid_graph", "DFS with three states",
    "Mark each course new, in progress or done. Reaching a course that's still in progress means a cycle.",
    "O(V + E)", "O(V + E)",
    "Just as standard as Kahn's. Use it if DFS comes to you more easily than in-degrees; very long chains can hit Python's recursion limit.", """
def canFinish(numCourses, prerequisites):
    adj = defaultdict(list)
    for a, b in prerequisites:
        adj[b].append(a)
    state = [0] * numCourses   # 0 new, 1 in progress, 2 done
    def has_cycle(u):
        if state[u] == 1:
            return True
        if state[u] == 2:
            return False
        state[u] = 1
        if any(has_cycle(v) for v in adj[u]):
            return True
        state[u] = 2
        return False
    return not any(has_cycle(i) for i in range(numCourses))
""")],
"course_schedule_ii": [alt("grid_graph", "DFS, then reverse the finish order",
    "Run the three-state DFS; append each course when it finishes. Reversed, that list is a valid order.",
    "O(V + E)", "O(V + E)",
    "Equally valid. Kahn's (the reference) builds the order front to back, which some find easier to explain.", """
def findOrder(numCourses, prerequisites):
    adj = defaultdict(list)
    for a, b in prerequisites:
        adj[b].append(a)
    state, order = [0] * numCourses, []
    def dfs(u):
        if state[u] == 1:
            return False
        if state[u] == 2:
            return True
        state[u] = 1
        for v in adj[u]:
            if not dfs(v):
                return False
        state[u] = 2
        order.append(u)
        return True
    for i in range(numCourses):
        if not dfs(i):
            return []
    return order[::-1]
""")],
"network_delay": [alt(None, "Bellman-Ford",
    "Relax every edge n - 1 times: each round, any shorter path found through an edge updates its end.",
    "O(V·E)", "O(V)",
    "Shorter code but slower. It's the one you need if edges can be negative, where Dijkstra breaks.", """
def networkDelayTime(times, n, k):
    dist = [float('inf')] * (n + 1)
    dist[k] = 0
    for _ in range(n - 1):
        for u, v, w in times:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    best = max(dist[1:])
    return best if best < float('inf') else -1
""")],
"swim_rising_water": [alt("binary_search", "Binary search the time, check with a flood fill",
    "Guess a time t; a DFS through cells <= t tells you whether the corner is reachable. Binary search for the smallest t that works.",
    "O(n² log n)", "O(n²)",
    "Same cost. 'Binary search on the answer plus a yes/no check' is a combination worth recognising; Dijkstra on the max-so-far does it in one pass.", """
def swimInWater(grid):
    n = len(grid)
    def can(t):
        if grid[0][0] > t:
            return False
        seen, stack = {(0, 0)}, [(0, 0)]
        while stack:
            r, c = stack.pop()
            if (r, c) == (n - 1, n - 1):
                return True
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen and grid[nr][nc] <= t:
                    seen.add((nr, nc))
                    stack.append((nr, nc))
        return False
    lo, hi = grid[0][0], max(map(max, grid))
    while lo < hi:
        mid = (lo + hi) // 2
        if can(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
""")],
"min_cost_connect": [alt("union_find", "Kruskal: cheapest edges first",
    "List every pair with its distance, sort, and add each edge that joins two different groups until everything is connected.",
    "O(n² log n)", "O(n²)",
    "Same cost. Kruskal is natural if you have union-find ready; Prim's (the reference) is the heap loop you already know from Dijkstra.", """
def minCostConnectPoints(points):
    n = len(points)
    edges = sorted((abs(x1 - x2) + abs(y1 - y2), i, j)
                   for i, (x1, y1) in enumerate(points) for j, (x2, y2) in enumerate(points) if i < j)
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    total = used = 0
    for w, i, j in edges:
        a, b = find(i), find(j)
        if a != b:
            parent[a] = b
            total += w
            used += 1
            if used == n - 1:
                break
    return total
""")],

# ── 1D DP ─────────────────────────────────────────────────────────────────────────────────────────────
"climbing_stairs": [alt("recursion", "Recursion with a memo",
    "ways(n) = ways(n - 1) + ways(n - 2): write that recursion, then add @cache so each n is computed once.",
    "O(n)", "O(n)",
    "Often the fastest route to a correct DP: write the recursion, add @cache, then turn it into a loop if they ask for O(1) space.", """
def climbStairs(n):
    @cache
    def ways(i):
        if i <= 1:
            return 1
        return ways(i - 1) + ways(i - 2)
    return ways(n)
""")],
"house_robber": [alt("recursion", "Recursion with a memo",
    "best(i) = the most you can take from house i on: skip it (best(i + 1)) or rob it (nums[i] + best(i + 2)).",
    "O(n)", "O(n)",
    "The same recurrence top-down. Easier to discover; the two-variable loop is the O(1)-space version.", """
def rob(nums):
    @cache
    def best(i):
        if i >= len(nums):
            return 0
        return max(best(i + 1), nums[i] + best(i + 2))
    return best(0)
""")],
"coin_change": [alt(None, "BFS over amounts",
    "Treat each amount as a node and each coin as an edge. BFS from 0 reaches the target amount first by the fewest coins.",
    "O(n·amount)", "O(amount)",
    "Same cost as the DP, and it shows 'fewest steps' is a shortest-path question. The table is what interviewers expect.", """
def coinChange(coins, amount):
    if amount == 0:
        return 0
    seen, q, steps = {0}, deque([0]), 0
    while q:
        steps += 1
        for _ in range(len(q)):
            a = q.popleft()
            for c in coins:
                b = a + c
                if b == amount:
                    return steps
                if b < amount and b not in seen:
                    seen.add(b)
                    q.append(b)
    return -1
""")],
"word_break": [alt("recursion", "Recursion with a memo",
    "ok(i) = can s[i:] be split? Try every word that starts at i and recurse on what's left, with @cache.",
    "O(n²)", "O(n)",
    "The most natural first version. The bottom-up table (the reference) avoids recursion on long strings.", """
def wordBreak(s, wordDict):
    words = set(wordDict)
    @cache
    def ok(i):
        if i == len(s):
            return True
        return any(s[i:j] in words and ok(j) for j in range(i + 1, len(s) + 1))
    return ok(0)
""")],
"lis": [alt("binary_search", "Patience sorting: keep the smallest tails",
    "tails[i] is the smallest last value of any increasing run of length i + 1. For each number, binary search its place in tails and overwrite it (or append).",
    "O(n log n)", "O(n)",
    "The follow-up interviewers ask for. Explain the O(n²) DP first; then this. Note tails is not itself an increasing subsequence of the input.", """
def lengthOfLIS(nums):
    import bisect
    tails = []
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
""")],
"longest_palindrome": [alt("dp_2d", "Table of which substrings are palindromes",
    "pal[i][j] is true when s[i] == s[j] and the inside, pal[i + 1][j - 1], is a palindrome. Fill it from short substrings to long.",
    "O(n²)", "O(n²)",
    "The textbook DP. Expanding around each centre (the reference) has the same time with O(1) space and less code.", """
def longestPalindrome(s):
    n = len(s)
    if n == 0:
        return ''
    pal = [[False] * n for _ in range(n)]
    lo, hi = 0, 0
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            if s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1]):
                pal[i][j] = True
                if j - i > hi - lo:
                    lo, hi = i, j
    return s[lo:hi + 1]
""")],
"palindromic_substrings": [alt("dp_2d", "Table of which substrings are palindromes",
    "Fill pal[i][j] as in Longest Palindromic Substring and count the true cells.",
    "O(n²)", "O(n²)",
    "Same time; expanding around centres uses O(1) space.", """
def countSubstrings(s):
    n = len(s)
    pal = [[False] * n for _ in range(n)]
    count = 0
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            if s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1]):
                pal[i][j] = True
                count += 1
    return count
""")],

# ── 2D DP ─────────────────────────────────────────────────────────────────────────────────────────────
"unique_paths": [alt(None, "Count the moves (combinatorics)",
    "Every path is m - 1 downs and n - 1 rights in some order, so the answer is 'choose which m - 1 of the m + n - 2 moves go down'.",
    "O(m + n)", "O(1)",
    "Elegant; mention it after the DP. The DP is what generalises once obstacles appear (Unique Paths II).", """
def uniquePaths(m, n):
    import math
    return math.comb(m + n - 2, m - 1)
""")],
"lcs": [alt("recursion", "Recursion with a memo",
    "f(i, j) = LCS of text1[i:] and text2[j:]: if the first letters match, 1 + f(i + 1, j + 1); otherwise the better of skipping one letter on either side.",
    "O(m·n)", "O(m·n)",
    "Often the easiest way to find the recurrence. The table avoids recursion depth issues on long strings.", """
def longestCommonSubsequence(text1, text2):
    @cache
    def f(i, j):
        if i == len(text1) or j == len(text2):
            return 0
        if text1[i] == text2[j]:
            return 1 + f(i + 1, j + 1)
        return max(f(i + 1, j), f(i, j + 1))
    return f(0, 0)
""")],
"edit_distance": [alt("recursion", "Recursion with a memo",
    "f(i, j) = edits to turn word1[i:] into word2[j:]: free if the letters match, else 1 + the best of insert, delete or replace.",
    "O(m·n)", "O(m·n)",
    "Each of the three operations becomes one recursive call, which makes the recurrence easy to explain. The table is safer for long words.", """
def minDistance(word1, word2):
    @cache
    def f(i, j):
        if i == len(word1):
            return len(word2) - j
        if j == len(word2):
            return len(word1) - i
        if word1[i] == word2[j]:
            return f(i + 1, j + 1)
        return 1 + min(f(i, j + 1), f(i + 1, j), f(i + 1, j + 1))
    return f(0, 0)
""")],
"longest_increasing_path": [alt("topo_sort", "Peel layers like Kahn's algorithm",
    "Edges go from each cell to bigger neighbours, which makes a DAG. Remove cells with no smaller neighbour, layer by layer; the number of layers is the longest path.",
    "O(m·n)", "O(m·n)",
    "Same cost with no recursion. The memoised DFS (the reference) is what most people write.", """
def longestIncreasingPath(matrix):
    R, C = len(matrix), len(matrix[0])
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    indeg = [[0] * C for _ in range(R)]
    for r in range(R):
        for c in range(C):
            for dr, dc in dirs:
                nr, nc = r + dr, c + dc
                if 0 <= nr < R and 0 <= nc < C and matrix[nr][nc] < matrix[r][c]:
                    indeg[r][c] += 1
    q = deque((r, c) for r in range(R) for c in range(C) if indeg[r][c] == 0)
    layers = 0
    while q:
        layers += 1
        for _ in range(len(q)):
            r, c = q.popleft()
            for dr, dc in dirs:
                nr, nc = r + dr, c + dc
                if 0 <= nr < R and 0 <= nc < C and matrix[nr][nc] > matrix[r][c]:
                    indeg[nr][nc] -= 1
                    if indeg[nr][nc] == 0:
                        q.append((nr, nc))
    return layers
""")],
"target_sum": [alt("recursion", "Recursion with a memo",
    "ways(i, total) = ways(i + 1, total + nums[i]) + ways(i + 1, total - nums[i]); @cache stores each (i, total) once.",
    "O(n·sum)", "O(n·sum)",
    "The recursion you'd write first, plus @cache. Same states as the dictionary version (the reference).", """
def findTargetSumWays(nums, target):
    @cache
    def ways(i, total):
        if i == len(nums):
            return int(total == target)
        return ways(i + 1, total + nums[i]) + ways(i + 1, total - nums[i])
    return ways(0, 0)
""")],

# ── Greedy ────────────────────────────────────────────────────────────────────────────────────────────
"max_subarray": [
  alt("dp_1d", "The same thing seen as DP",
    "Let dp[i] be the best sum of a subarray ending at i: dp[i] = max(nums[i], dp[i - 1] + nums[i]). The reference's `cur` is that table squeezed into one variable.",
    "O(n)", "O(1)",
    "Not a different algorithm: Kadane's algorithm is this DP. Saying so shows you understand why it works."),
  alt("prefix", "Best prefix difference",
    "A subarray sum is prefix[r] - prefix[l]. Walk once, keeping the lowest prefix seen so far; the best answer is the largest current prefix minus that minimum.",
    "O(n)", "O(1)",
    "Same cost, and the same idea as Best Time to Buy and Sell Stock. A good one to show you can connect problems.", """
def maxSubArray(nums):
    best, prefix, lowest = nums[0], 0, 0
    for x in nums:
        prefix += x
        best = max(best, prefix - lowest)
        lowest = min(lowest, prefix)
    return best
""")],
"jump_game": [alt("dp_1d", "DP from the right",
    "good[i] is true if some index you can jump to from i is good; the last index is good. Fill from the right.",
    "O(n²) worst case", "O(n)",
    "Correct and easy to justify. Noticing you only need the leftmost good index turns it into the O(n) greedy.", """
def canJump(nums):
    n = len(nums)
    good = [False] * n
    good[-1] = True
    for i in range(n - 2, -1, -1):
        good[i] = any(good[j] for j in range(i + 1, min(n, i + nums[i] + 1)))
    return good[0]
""")],
"jump_game_ii": [alt("dp_1d", "DP: fewest jumps to each index",
    "dp[j] = fewest jumps to reach j. From each i, update every j it can reach with dp[i] + 1.",
    "O(n²) worst case", "O(n)",
    "Easy to trust. The greedy (the reference) is this DP done one 'level' of reachable indices at a time, like a BFS.", """
def jump(nums):
    n = len(nums)
    dp = [0] + [float('inf')] * (n - 1)
    for i in range(n):
        for j in range(i + 1, min(n, i + nums[i] + 1)):
            dp[j] = min(dp[j], dp[i] + 1)
    return dp[-1]
""")],
"hand_of_straights": [alt("heap", "Always start a group at the smallest card",
    "Keep the distinct card values in a min-heap. The smallest card must start a group, so take it and the next groupSize - 1 values.",
    "O(n log n)", "O(n)",
    "The same greedy idea with a heap instead of sorting the keys once. Either is fine; say why the smallest card must start a group.", """
def isNStraightHand(hand, groupSize):
    if len(hand) % groupSize:
        return False
    count = Counter(hand)
    heap = list(count)
    heapq.heapify(heap)
    while heap:
        first = heap[0]
        for x in range(first, first + groupSize):
            if count[x] == 0:
                return False
            count[x] -= 1
            if count[x] == 0:
                if x != heap[0]:
                    return False
                heapq.heappop(heap)
    return True
""")],
"partition_labels": [alt("intervals", "Merge each letter's span",
    "Each letter covers [first index, last index]. Merge the overlapping spans; each merged span is one part.",
    "O(n)", "O(1) (26 letters)",
    "Shows the problem is Merge Intervals in disguise. The greedy (the reference) does the same merge in one pass without building the spans.", """
def partitionLabels(s):
    spans = {}
    for i, c in enumerate(s):
        if c in spans:
            spans[c][1] = i
        else:
            spans[c] = [i, i]
    res = []
    start, end = 0, -1
    for a, b in sorted(spans.values()):
        if a > end:
            if end >= 0:
                res.append(end - start + 1)
            start, end = a, b
        else:
            end = max(end, b)
    res.append(end - start + 1)
    return res
""")],
"valid_parenthesis_string": [alt("stack", "Two stacks of indices",
    "Push the index of each '(' and each '*'. A ')' uses an open bracket if there is one, else a star. At the end, every leftover '(' needs a star after it.",
    "O(n)", "O(n)",
    "Easier to reason about than tracking a range of possible open counts. The lo/hi greedy (the reference) is the O(1)-space version.", """
def checkValidString(s):
    opens, stars = [], []
    for i, ch in enumerate(s):
        if ch == '(':
            opens.append(i)
        elif ch == '*':
            stars.append(i)
        elif opens:
            opens.pop()
        elif stars:
            stars.pop()
        else:
            return False
    while opens and stars:
        if opens.pop() > stars.pop():
            return False
    return not opens
""")],

# ── Intervals ─────────────────────────────────────────────────────────────────────────────────────────
"non_overlapping": [alt("greedy", "It's the classic greedy: keep what ends first",
    "Sorting by end and keeping every interval that starts after the last kept one is activity selection, the textbook greedy. The answer is the rest.",
    "O(n log n)", "O(1)",
    "Same code as the reference; naming it as greedy, and why ending first can't hurt, is what interviewers want to hear."),
],

# ── Matrix / math ─────────────────────────────────────────────────────────────────────────────────────
"rotate_image": [alt(None, "Rotate four cells at a time, ring by ring",
    "Each cell moves to where the next corner's cell was. Rotate each group of four in place, ring by ring from the outside.",
    "O(n²)", "O(1)",
    "Same cost and fully in place. Transpose then reverse (the reference) is much easier to get right under pressure.", """
def rotate(matrix):
    n = len(matrix)
    for i in range(n // 2):
        for j in range(i, n - 1 - i):
            t = matrix[i][j]
            matrix[i][j] = matrix[n - 1 - j][i]
            matrix[n - 1 - j][i] = matrix[n - 1 - i][n - 1 - j]
            matrix[n - 1 - i][n - 1 - j] = matrix[j][n - 1 - i]
            matrix[j][n - 1 - i] = t
""")],
"set_matrix_zeroes": [alt(None, "Remember zero rows and columns in sets",
    "One pass records which rows and columns hold a zero; a second pass zeroes them.",
    "O(m·n)", "O(m + n)",
    "Say this first. Using the first row and column as the markers (the reference) is the O(1)-space follow-up.", """
def setZeroes(matrix):
    rows, cols = set(), set()
    for r, row in enumerate(matrix):
        for c, v in enumerate(row):
            if v == 0:
                rows.add(r)
                cols.add(c)
    for r, row in enumerate(matrix):
        for c in range(len(row)):
            if r in rows or c in cols:
                row[c] = 0
""")],
"happy_number": [alt("linked_list", "Fast and slow pointers on the numbers",
    "The sequence n, next(n), next(next(n))... either reaches 1 or loops, just like a linked list with a cycle. Floyd's fast and slow pointers find out without a set.",
    "O(log n)", "O(1)",
    "Drops the set. Spotting that a number sequence is a linked list in disguise is the real lesson.", """
def isHappy(n):
    def nxt(x):
        return sum(int(d) ** 2 for d in str(x))
    slow, fast = n, nxt(n)
    while fast != 1 and slow != fast:
        slow, fast = nxt(slow), nxt(nxt(fast))
    return fast == 1
""")],
"pow_x_n": [alt("recursion", "Halve the exponent recursively",
    "x^n = (x^(n // 2))², times one more x when n is odd. Negative n: compute 1 / x^(-n).",
    "O(log n)", "O(log n) call stack",
    "The clearest way to explain fast power. The loop over n's bits (the reference) does the same in O(1) space.", """
def myPow(x, n):
    if n < 0:
        return 1 / myPow(x, -n)
    if n == 0:
        return 1.0
    half = myPow(x, n // 2)
    return half * half * (x if n % 2 else 1)
""")],

# ── Bits ──────────────────────────────────────────────────────────────────────────────────────────────
"single_number": [alt("hashmap", "Count with a dict",
    "Count every value and return the one seen once.",
    "O(n)", "O(n)",
    "The obvious answer. XOR is the O(1)-space trick the problem is really asking for.", """
def singleNumber(nums):
    count = Counter(nums)
    return next(x for x, c in count.items() if c == 1)
""")],
"missing_number": [alt(None, "Expected sum minus actual sum",
    "0 + 1 + ... + n is n(n + 1) / 2; whatever the array's sum falls short by is the missing number.",
    "O(n)", "O(1)",
    "Just as fast and easier to explain. In Python the sum can't overflow, so XOR has no advantage here.", """
def missingNumber(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)
""")],
"hamming_weight": [alt(None, "Let Python count",
    "bin(n).count('1') (or n.bit_count() in Python 3.10+).",
    "O(1) for 32 bits", "O(1)",
    "Fine in real code. Interviewers usually want n & (n - 1) to see that you know the bit trick.", """
def hammingWeight(n):
    return bin(n).count('1')
""")],
"two_single_numbers": [alt("hashmap", "Count with a dict",
    "Count every value and return the two seen once.",
    "O(n)", "O(n)",
    "The obvious answer. Splitting by one differing bit (the reference) is the O(1)-space trick.", """
def singleNumbers(nums):
    count = Counter(nums)
    return [x for x, c in count.items() if c == 1]
""")],

# ── Recursion ─────────────────────────────────────────────────────────────────────────────────────────
"fib_number": [alt("dp_1d", "Bottom-up with two variables",
    "Keep only the last two values and step forward n times.",
    "O(n)", "O(1)",
    "The same recurrence filled from the bottom: no recursion and O(1) space. This step from memo to loop is exactly how 1D DP starts.", """
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
""")],
"power_of_two": [alt("bit", "Exactly one bit set",
    "A power of two has a single 1 bit, and n & (n - 1) clears the lowest 1 bit, so the result is 0 exactly for powers of two.",
    "O(1)", "O(1)",
    "The one-line answer interviewers know. The recursion is the clearer derivation; mention this as the follow-up.", """
def isPowerOfTwo(n):
    return n > 0 and n & (n - 1) == 0
""")],
"find_winner": [alt(None, "Simulate the circle with a deque",
    "Rotate the deque k - 1 places and remove the front, until one friend is left.",
    "O(n·k)", "O(n)",
    "Matches the story exactly and is easy to trust. The recursion (the reference) is the O(n) answer.", """
def findTheWinner(n, k):
    q = deque(range(1, n + 1))
    while len(q) > 1:
        q.rotate(-(k - 1))
        q.popleft()
    return q[0]
""")],
"kth_grammar": [alt("bit", "Count the 1 bits in k - 1",
    "Going down a row, a right child flips the value. The right turns on the way to position k are the 1 bits of k - 1, so the answer is their count mod 2.",
    "O(log k)", "O(1)",
    "A neat follow-up. The recursion (the reference) is what to derive first; this falls out of it.", """
def kthGrammar(n, k):
    return bin(k - 1).count('1') % 2
""")],

# ── Trie ──────────────────────────────────────────────────────────────────────────────────────────────
"word_search_ii": [alt("backtracking", "Word Search once per word",
    "Run the single-word grid search for each word in the list.",
    "O(W·m·n·4^L)", "O(L)",
    "Correct and reuses Word Search, but repeats work for words with a shared prefix. The trie searches all of them in one pass.", """
def findWords(board, words):
    R, C = len(board), len(board[0])
    def exists(w):
        def dfs(r, c, i):
            if i == len(w):
                return True
            if not (0 <= r < R and 0 <= c < C) or board[r][c] != w[i]:
                return False
            ch, board[r][c] = board[r][c], '#'
            found = any(dfs(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            board[r][c] = ch
            return found
        return any(dfs(r, c, 0) for r in range(R) for c in range(C))
    return [w for w in dict.fromkeys(words) if exists(w)]
""")],
}
