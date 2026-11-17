"""NeetCode 150 part A: remaining Arrays, Two Pointers, Sliding Window, Stack, Binary Search,
Linked List, Trees, Tries, Heap problems. Same format as problems.py."""
from .problems import P, F, D

_RANDOM_NODE = '''
class Node:
    def __init__(self, x, next=None, random=None):
        self.val = int(x)
        self.next = next
        self.random = random
'''

_RANDOM_HARNESS = '''
def harness(fn, args):
    data = args[0]
    nodes = [ns['Node'](v) for v, _ in data]
    for i, n in enumerate(nodes):
        n.next = nodes[i + 1] if i + 1 < len(nodes) else None
        r = data[i][1]
        n.random = nodes[r] if r is not None else None
    old = set(map(id, nodes))
    res = fn(nodes[0] if nodes else None)
    seen, cur = [], res
    while cur is not None and len(seen) < 10000:
        if id(cur) in old:
            return "SHARED NODES (not a deep copy)"
        seen.append(cur)
        cur = cur.next
    idx = {id(n): i for i, n in enumerate(seen)}
    return [[n.val, idx.get(id(n.random)) if n.random is not None else None] for n in seen]
'''

PROBLEMS_A = [
P("encode_decode", 8, "Encode and Decode Strings", "hashmap", "Medium",
  "Write encode(strs) -> str and decode(s) -> list so that decode(encode(strs)) == strs, for ANY characters.",
  "Prefix each string with its length and a separator: '4#neet'. The length tells you exactly where the string ends, so the content can contain anything.",
  "Search for '#' starting at i (s.index('#', i)), not from 0. A plain delimiter like ',' breaks when strings contain it.",
  "O(n)", "O(n)",
  ["Can strings contain any character, including digits and '#'?", "Can the list or strings be empty?"],
  ["empty list", "list with one empty string", "strings containing '#' or digits"],
  '''
def encode(strs):
    return ''.join(f'{len(s)}#{s}' for s in strs)  # <<

def decode(s):
    res, i = [], 0
    while i < len(s):
        j = s.index('#', i)  # <<
        n = int(s[i:j])
        res.append(s[j + 1:j + 1 + n])  # <<
        i = j + 1 + n  # <<
    return res
''',
  F("encode", [([["neet","code","love","you"]], ["neet","code","love","you"]), ([["we","say",":","yes"]], ["we","say",":","yes"]),
               ([[""]], [""]), ([[]], []), ([["a#b","12#",""]], ["a#b","12#",""])],
    harness="def harness(fn, args):\n    return get('decode')(fn(args[0]))\n")),

P("permutation_in_string", 18, "Permutation in String", "sliding_window", "Medium",
  "Return True if s2 contains a permutation of s1 as a contiguous substring.",
  "Fixed-size window of len(s1) sliding over s2. Keep a character count of the window; it matches when it equals s1's counts.",
  "Add the entering char AND remove the leaving char each step. With 26-letter arrays the compare is O(26).",
  "O(n)", "O(1)",
  ["Lowercase letters only?"],
  ["s1 longer than s2", "match at the very start", "match at the very end"],
  '''
def checkInclusion(s1, s2):
    if len(s1) > len(s2):
        return False
    need = Counter(s1)
    window = Counter(s2[:len(s1)])  # <<
    if window == need:
        return True
    for r in range(len(s1), len(s2)):
        window[s2[r]] += 1  # <<
        window[s2[r - len(s1)]] -= 1  # <<
        if window == need:
            return True
    return False
''',
  F("checkInclusion", [(["ab","eidbaooo"], True), (["ab","eidboaoo"], False), (["abc","ab"], False), (["a","a"], True),
                       (["adc","dcda"], True)])),

P("sliding_window_max", 20, "Sliding Window Maximum", "mono_stack", "Hard",
  "Return the maximum of every contiguous window of size k, in O(n).",
  "Monotonic DECREASING deque of indices. A new value evicts smaller values from the back (they can never be a max again); the front is the window max.",
  "Pop the front when its index has slid out (q[0] <= i - k). Only record once i >= k - 1.",
  "O(n)", "O(k)",
  ["Is k always <= len(nums)?"],
  ["k = 1", "k = len(nums)", "decreasing array", "negative numbers"],
  '''
def maxSlidingWindow(nums, k):
    q = deque()
    res = []
    for i, x in enumerate(nums):
        while q and nums[q[-1]] < x:  # <<
            q.pop()
        q.append(i)
        if q[0] <= i - k:  # <<
            q.popleft()
        if i >= k - 1:
            res.append(nums[q[0]])  # <<
    return res
''',
  F("maxSlidingWindow", [([[1,3,-1,-3,5,3,6,7], 3], [3,3,5,5,6,7]), ([[1], 1], [1]), ([[9,8,7], 2], [9,8]), ([[1,-1], 1], [1,-1])])),

P("generate_parentheses", 24, "Generate Parentheses", "backtracking", "Medium",
  "Return all well-formed strings of n pairs of parentheses.",
  "Build left to right. You may add '(' while open < n, and ')' while close < open. Those two rules guarantee validity, so nothing needs checking at the end.",
  "The condition for ')' is close < open, not close < n.",
  "O(4^n/√n)", "O(n)",
  ["Any output order?"],
  ["n = 1", "n = 0 (if allowed)"],
  '''
def generateParenthesis(n):
    res = []
    def bt(s, open_, close):
        if len(s) == 2 * n:
            res.append(s)
            return
        if open_ < n:  # <<
            bt(s + '(', open_ + 1, close)
        if close < open_:  # <<
            bt(s + ')', open_, close + 1)
    bt('', 0, 0)
    return res
''',
  F("generateParenthesis", [([3], ["((()))","(()())","(())()","()(())","()()()"]), ([1], ["()"]), ([2], ["(())","()()"])],
    compare="unordered")),

P("car_fleet", 26, "Car Fleet", "mono_stack", "Medium",
  "Cars at position[i] drive toward target at speed[i] on one lane; a faster car catching a slower one joins its fleet. How many fleets arrive?",
  "Sort by position, closest to target first. Compute each car's arrival time. A car arriving no later than the fleet ahead merges into it; a strictly slower one starts a new fleet.",
  "Process from the FRONT (closest to target). Use float division for time.",
  "O(n log n)", "O(n)",
  ["Can two cars share a position?", "Does catching up exactly at the target count as one fleet?"],
  ["single car", "everyone merges into one fleet", "already sorted input"],
  '''
def carFleet(target, position, speed):
    cars = sorted(zip(position, speed), reverse=True)  # <<
    stack = []
    for p, s in cars:
        t = (target - p) / s
        if not stack or t > stack[-1]:  # <<
            stack.append(t)  # <<
    return len(stack)
''',
  F("carFleet", [([12, [10,8,0,5,3], [2,4,1,1,3]], 3), ([10, [3], [3]], 1), ([100, [0,2,4], [4,2,1]], 1)])),

P("search_2d_matrix", 29, "Search a 2D Matrix", "binary_search", "Medium",
  "Each row is sorted and starts after the previous row ends. Return True if target is in the matrix, in O(log(m·n)).",
  "It's one sorted array of length R·C laid out in rows. Binary search over 0..R·C-1 and map index -> (idx // C, idx % C).",
  "Divide by the number of COLUMNS, not rows.",
  "O(log(m·n))", "O(1)",
  ["Is each row's first value greater than the previous row's last?"],
  ["1 x 1 matrix", "target smaller than everything", "target in last cell"],
  '''
def searchMatrix(matrix, target):
    R, C = len(matrix), len(matrix[0])
    lo, hi = 0, R * C - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        v = matrix[mid // C][mid % C]  # <<
        if v == target:
            return True
        if v < target:
            lo = mid + 1  # <<
        else:
            hi = mid - 1
    return False
''',
  F("searchMatrix", [([[[1,3,5,7],[10,11,16,20],[23,30,34,60]], 3], True), ([[[1,3,5,7],[10,11,16,20],[23,30,34,60]], 13], False),
                     ([[[1]], 1], True), ([[[1,3]], 3], True)])),

P("median_two_sorted", 34, "Median of Two Sorted Arrays", "binary_search", "Hard",
  "Return the median of two sorted arrays in O(log(m + n)).",
  "Binary search how many elements the SMALLER array contributes to the left half (i); the other gives half - i. The split is right when Aleft <= Bright and Bleft <= Aright.",
  "Use ±infinity for out-of-range neighbours. Odd total: median = min of the right sides. Search the smaller array so j stays in range.",
  "O(log(min(m, n)))", "O(1)",
  ["Can either array be empty?", "Return a float?"],
  ["one array empty", "all of A smaller than all of B", "odd vs even total length"],
  '''
def findMedianSortedArrays(nums1, nums2):
    A, B = nums1, nums2
    if len(A) > len(B):
        A, B = B, A  # <<
    total = len(A) + len(B)
    half = total // 2
    lo, hi = 0, len(A)
    while True:
        i = (lo + hi) // 2
        j = half - i
        Aleft = A[i - 1] if i > 0 else float('-inf')
        Aright = A[i] if i < len(A) else float('inf')
        Bleft = B[j - 1] if j > 0 else float('-inf')
        Bright = B[j] if j < len(B) else float('inf')
        if Aleft <= Bright and Bleft <= Aright:  # <<
            if total % 2:
                return float(min(Aright, Bright))  # <<
            return (max(Aleft, Bleft) + min(Aright, Bright)) / 2
        elif Aleft > Bright:
            hi = i - 1  # <<
        else:
            lo = i + 1
''',
  F("findMedianSortedArrays", [([[1,3],[2]], 2.0), ([[1,2],[3,4]], 2.5), ([[],[1]], 1.0), ([[2],[]], 2.0),
                               ([[1,2,3,4,5],[6,7,8]], 4.5)], compare="float")),

P("copy_random_list", 39, "Copy List with Random Pointer", "linked_list", "Medium",
  "Deep-copy a linked list where each node also has a random pointer (to any node or None). Nodes are Node(val, next, random).",
  "Two passes with a map old -> new. Pass 1 creates every copy; pass 2 wires next and random through the map.",
  "Seed the map with {None: None} so missing next/random need no special case. Never return original nodes.",
  "O(n)", "O(n)",
  ["Can random point to itself?", "Can the list be empty?"],
  ["empty list", "random points to itself", "all randoms None"],
  '''
def copyRandomList(head):
    old_to_new = {None: None}  # <<
    cur = head
    while cur:
        old_to_new[cur] = Node(cur.val)  # <<
        cur = cur.next
    cur = head
    while cur:
        copy = old_to_new[cur]
        copy.next = old_to_new[cur.next]  # <<
        copy.random = old_to_new[cur.random]  # <<
        cur = cur.next
    return old_to_new[head]
''',
  F("copyRandomList", [([[[7,None],[13,0],[11,4],[10,2],[1,0]]], [[7,None],[13,0],[11,4],[10,2],[1,0]]),
                       ([[[1,1],[2,1]]], [[1,1],[2,1]]), ([[]], [])],
    prelude=_RANDOM_NODE, harness=_RANDOM_HARNESS)),

P("add_two_numbers", 40, "Add Two Numbers", "linked_list", "Medium",
  "Two non-negative integers are stored as linked lists of digits in REVERSE order. Return their sum as a list in the same format.",
  "Grade-school addition from the head (ones digit first) with a carry. Dummy head to build the result.",
  "Keep looping while l1 OR l2 OR carry: a final carry creates a new node.",
  "O(max(m, n))", "O(1)",
  ["Leading zeros possible?"],
  ["different lengths", "final carry [9,9]+[1]", "both zero"],
  '''
def addTwoNumbers(l1, l2):
    dummy = tail = ListNode()
    carry = 0
    while l1 or l2 or carry:  # <<
        v = carry + (l1.val if l1 else 0) + (l2.val if l2 else 0)
        carry, d = divmod(v, 10)  # <<
        tail.next = ListNode(d)
        tail = tail.next
        l1 = l1.next if l1 else None
        l2 = l2.next if l2 else None
    return dummy.next
''',
  F("addTwoNumbers", [([[2,4,3],[5,6,4]], [7,0,8]), ([[0],[0]], [0]), ([[9,9,9,9,9,9,9],[9,9,9,9]], [8,9,9,9,0,0,0,1])],
    arg_types=["linked","linked"], ret_type="linked")),

P("linked_list_cycle", 41, "Linked List Cycle", "linked_list", "Easy",
  "Return True if the linked list contains a cycle. O(1) memory.",
  "Floyd: slow moves 1, fast moves 2. If there's a cycle fast laps slow and they meet; otherwise fast hits None.",
  "Compare nodes with `is`, not values. Loop condition: fast and fast.next.",
  "O(n)", "O(1)",
  ["Can I modify the list?"],
  ["empty list", "single node, no cycle", "cycle back to head"],
  '''
def hasCycle(head):
    slow = fast = head
    while fast and fast.next:  # <<
        slow, fast = slow.next, fast.next.next  # <<
        if slow is fast:  # <<
            return True
    return False
''',
  F("hasCycle", [([[[3,2,0,-4], 1]], True), ([[[1,2], 0]], True), ([[[1], -1]], False), ([[[], -1]], False)],
    arg_types=["linked_cycle"])),

P("find_duplicate", 42, "Find the Duplicate Number", "linked_list", "Medium",
  "nums has n+1 integers in [1, n] with exactly one repeated value (maybe many times). Find it with O(1) space, without modifying nums.",
  "Treat i -> nums[i] as a linked list; the duplicate is where two pointers enter the cycle. Floyd phase 1 finds a meeting point; phase 2 from 0 and the meeting point meet at the cycle start.",
  "Start both at index 0. Phase 2 moves BOTH one step at a time.",
  "O(n)", "O(1)",
  ["Can I modify the array or use extra memory?"],
  ["duplicate appears many times", "n = 1 ([1,1])"],
  '''
def findDuplicate(nums):
    slow = fast = 0
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]  # <<
        if slow == fast:
            break
    slow2 = 0
    while slow != slow2:  # <<
        slow, slow2 = nums[slow], nums[slow2]  # <<
    return slow
''',
  F("findDuplicate", [([[1,3,4,2,2]], 2), ([[3,1,3,4,2]], 3), ([[3,3,3,3,3]], 3), ([[1,1]], 1)])),

P("merge_k_lists", 44, "Merge K Sorted Lists", "heap", "Hard",
  "Merge k sorted linked lists into one sorted list.",
  "Min-heap holding the current head of each list. Pop the smallest, attach it, push that node's next.",
  "Push (val, list_index, node): the index breaks ties so Python never compares two ListNodes.",
  "O(N log k)", "O(k)",
  ["Can k be 0? Can lists be empty?"],
  ["no lists", "all lists empty", "one list"],
  '''
def mergeKLists(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))  # <<
    dummy = tail = ListNode()
    while heap:
        _, i, node = heapq.heappop(heap)
        tail.next = node  # <<
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))  # <<
    return dummy.next
''',
  F("mergeKLists", [([[[1,4,5],[1,3,4],[2,6]]], [1,1,2,3,4,4,5,6]), ([[]], []), ([[[]]], []), ([[[2],[1]]], [1,2])],
    arg_types=["linked_many"], ret_type="linked")),

P("reverse_k_group", 45, "Reverse Nodes in k-Group", "linked_list", "Hard",
  "Reverse the list k nodes at a time; a leftover tail shorter than k stays as is.",
  "Per group: find the k-th node (stop if missing), reverse the segment pointing its tail at group_next, then reconnect group_prev to the new head and advance group_prev to the old head.",
  "Initialise prev = group_next when reversing, so the reversed group's tail already links forward.",
  "O(n)", "O(1)",
  ["Is the leftover left untouched?"],
  ["k = 1 (unchanged)", "k = length", "length not a multiple of k"],
  '''
def reverseKGroup(head, k):
    dummy = ListNode(0, head)
    group_prev = dummy
    while True:
        kth = group_prev
        for _ in range(k):  # <<
            kth = kth.next
            if not kth:
                return dummy.next
        group_next = kth.next
        prev, cur = group_next, group_prev.next  # <<
        while cur is not group_next:
            nxt = cur.next
            cur.next = prev
            prev, cur = cur, nxt
        first = group_prev.next
        group_prev.next = kth  # <<
        group_prev = first  # <<
''',
  F("reverseKGroup", [([[1,2,3,4,5], 2], [2,1,4,3,5]), ([[1,2,3,4,5], 3], [3,2,1,4,5]), ([[1], 1], [1]), ([[1,2], 2], [2,1])],
    arg_types=["linked", None], ret_type="linked")),

P("subtree", 51, "Subtree of Another Tree", "tree_dfs", "Easy",
  "Return True if subRoot is identical to some subtree of root.",
  "At every node of root, ask sameTree(node, subRoot). Reuse Same Tree as a helper.",
  "Base case: if root is None return False (subRoot is non-empty).",
  "O(m·n)", "O(h)",
  ["Is subRoot non-empty?"],
  ["match deep in a branch", "same values but extra child below", "single nodes"],
  '''
def isSubtree(root, subRoot):
    def same(a, b):
        if not a or not b:
            return a is b  # <<
        return a.val == b.val and same(a.left, b.left) and same(a.right, b.right)
    if not root:
        return False  # <<
    return same(root, subRoot) or isSubtree(root.left, subRoot) or isSubtree(root.right, subRoot)  # <<
''',
  F("isSubtree", [([[3,4,5,1,2],[4,1,2]], True), ([[3,4,5,1,2,None,None,None,None,0],[4,1,2]], False), ([[1,1],[1]], True)],
    arg_types=["tree","tree"])),

P("lca_bst", 52, "Lowest Common Ancestor of a BST", "tree_dfs", "Medium",
  "Given a BST and two of its nodes p and q, return their lowest common ancestor node.",
  "Use the BST order: if both are smaller go left, both bigger go right; otherwise the current node is where they split, so it's the LCA.",
  "A node can be its own ancestor (p is the LCA when q is under p). No recursion needed.",
  "O(h)", "O(1)",
  ["Are p and q guaranteed to exist?", "Values unique?"],
  ["p is an ancestor of q", "p and q on opposite sides of root"],
  '''
def lowestCommonAncestor(root, p, q):
    cur = root
    while cur:
        if p.val < cur.val and q.val < cur.val:  # <<
            cur = cur.left
        elif p.val > cur.val and q.val > cur.val:  # <<
            cur = cur.right
        else:
            return cur  # <<
''',
  F("lowestCommonAncestor", [([[6,2,8,0,4,7,9,None,None,3,5], 2, 8], 6), ([[6,2,8,0,4,7,9,None,None,3,5], 2, 4], 2), ([[2,1], 2, 1], 2)],
    harness='''
def harness(fn, args):
    root = to_tree(args[0])
    def find(n, v):
        while n and n.val != v:
            n = n.left if v < n.val else n.right
        return n
    res = fn(root, find(root, args[1]), find(root, args[2]))
    return res.val if res else None
''')),

P("good_nodes", 55, "Count Good Nodes in Binary Tree", "tree_dfs", "Medium",
  "A node is good if no node on the path from the root to it has a greater value. Count good nodes.",
  "DFS passing the max value seen on the path so far. A node is good if node.val >= that max.",
  "Use >= (equal values still count). Pass the updated max to BOTH children.",
  "O(n)", "O(h)",
  [],
  ["single node", "strictly decreasing path", "equal values"],
  '''
def goodNodes(root):
    def dfs(node, best):
        if not node:
            return 0
        good = 1 if node.val >= best else 0  # <<
        best = max(best, node.val)  # <<
        return good + dfs(node.left, best) + dfs(node.right, best)  # <<
    return dfs(root, root.val)
''',
  F("goodNodes", [([[3,1,4,3,None,1,5]], 4), ([[3,3,None,4,2]], 3), ([[1]], 1)], arg_types=["tree"])),

P("build_tree", 58, "Construct Binary Tree from Preorder and Inorder", "tree_dfs", "Medium",
  "Rebuild a binary tree (unique values) from its preorder and inorder traversals.",
  "preorder gives roots in order of construction; the root's index in inorder splits left subtree from right. Recurse on index ranges, consuming preorder with an iterator.",
  "Build LEFT before RIGHT (preorder order). Map value -> inorder index for O(1) lookups.",
  "O(n)", "O(n)",
  ["Are values unique?"],
  ["single node", "left-skewed", "right-skewed"],
  '''
def buildTree(preorder, inorder):
    idx = {v: i for i, v in enumerate(inorder)}
    pre = iter(preorder)
    def build(lo, hi):
        if lo > hi:
            return None  # <<
        val = next(pre)  # <<
        node = TreeNode(val)
        mid = idx[val]
        node.left = build(lo, mid - 1)  # <<
        node.right = build(mid + 1, hi)
        return node
    return build(0, len(inorder) - 1)
''',
  F("buildTree", [([[3,9,20,15,7],[9,3,15,20,7]], [3,9,20,None,None,15,7]), ([[-1],[-1]], [-1]), ([[1,2],[2,1]], [1,2])],
    ret_type="tree")),

P("serialize_tree", 60, "Serialize and Deserialize Binary Tree", "tree_dfs", "Hard",
  "Design a Codec with serialize(root) -> str and deserialize(data) -> root that round-trips any binary tree.",
  "Preorder with a marker for None ('N'). Deserialize by consuming the same preorder with an iterator: value -> node, then build left, then right.",
  "The None markers are what make preorder alone unambiguous.",
  "O(n)", "O(n)",
  ["Any format allowed?", "Negative values?"],
  ["empty tree", "negative values", "skewed tree"],
  '''
class Codec:
    def serialize(self, root):
        out = []
        def dfs(node):
            if not node:
                out.append('N')  # <<
                return
            out.append(str(node.val))
            dfs(node.left)
            dfs(node.right)
        dfs(root)
        return ','.join(out)
    def deserialize(self, data):
        vals = iter(data.split(','))
        def build():
            v = next(vals)
            if v == 'N':
                return None  # <<
            node = TreeNode(int(v))
            node.left = build()  # <<
            node.right = build()
            return node
        return build()
''',
  F("Codec", [([[1,2,3,None,None,4,5]], [1,2,3,None,None,4,5]), ([[]], []), ([[-1,0,None,1]], [-1,0,None,1])],
    harness='''
def harness(fn, args):
    c = fn()
    s = c.serialize(to_tree(args[0]))
    if not isinstance(s, str):
        return "serialize must return a str"
    return from_tree(c.deserialize(s))
''')),

P("word_dictionary", 62, "Design Add and Search Words", "trie", "Medium",
  "Design addWord(word) and search(word) where '.' in the search matches any single letter.",
  "Trie. Search with DFS: a normal letter follows one child; '.' tries every child.",
  "At the end of the word, check the END marker, not just that the node exists. Skip the marker key when branching on '.'.",
  "O(26^L) worst", "O(total chars)",
  ["Only lowercase letters and '.'?"],
  ["search for a prefix of a word", "all dots '...'", "search before any add"],
  '''
class WordDictionary:
    def __init__(self):
        self.root = {}
    def addWord(self, word):
        cur = self.root
        for ch in word:
            cur = cur.setdefault(ch, {})
        cur['$'] = True
    def search(self, word):
        def dfs(node, i):
            if i == len(word):
                return '$' in node  # <<
            ch = word[i]
            if ch == '.':
                return any(dfs(child, i + 1) for k, child in node.items() if k != '$')  # <<
            return ch in node and dfs(node[ch], i + 1)  # <<
        return dfs(self.root, 0)
''',
  D("WordDictionary", [(["WordDictionary","addWord","addWord","addWord","search","search","search","search"],
                        [[],["bad"],["dad"],["mad"],["pad"],["bad"],[".ad"],["b.."]],
                        [None,None,None,None,False,True,True,True]),
                       (["WordDictionary","addWord","search","search"], [[],["ab"],["a"],["a."]], [None,None,False,True])])),

P("word_search_ii", 63, "Word Search II", "trie", "Hard",
  "Return all words from a list that can be traced through adjacent grid cells (no cell reused per word).",
  "Put all words in a trie, then DFS the grid once per cell while walking the trie: every board path is checked against ALL words at once.",
  "Store the word at its end node and pop it when found (no duplicates, prunes later searches). Restore the cell after exploring.",
  "O(m·n·4^L)", "O(total chars)",
  ["Can words repeat in the list?", "Output order?"],
  ["no words found", "word reuses a cell", "words sharing prefixes"],
  '''
def findWords(board, words):
    root = {}
    for w in words:
        node = root
        for ch in w:
            node = node.setdefault(ch, {})
        node['$'] = w  # <<
    R, C = len(board), len(board[0])
    res = []
    def dfs(r, c, node):
        ch = board[r][c]
        if ch not in node:
            return
        nxt = node[ch]
        if '$' in nxt:
            res.append(nxt.pop('$'))  # <<
        board[r][c] = '#'
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C:
                dfs(nr, nc, nxt)  # <<
        board[r][c] = ch
    for r in range(R):
        for c in range(C):
            dfs(r, c, root)
    return res
''',
  F("findWords", [([[["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], ["oath","pea","eat","rain"]], ["eat","oath"]),
                  ([[["a","b"],["c","d"]], ["abcb"]], []), ([[["a","a"]], ["aaa","aa"]], ["aa"])], compare="unordered")),

P("kth_largest_stream", 64, "Kth Largest Element in a Stream", "heap", "Easy",
  "Design KthLargest(k, nums) whose add(val) returns the k-th largest value seen so far.",
  "Min-heap capped at size k. Its top is the k-th largest.",
  "Pop only when size exceeds k. The constructor can reuse add().",
  "O(log k)", "O(k)",
  ["Can nums start with fewer than k elements?"],
  ["nums initially empty", "duplicates", "negative values"],
  '''
class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.heap = []
        for x in nums:
            self.add(x)
    def add(self, val):
        heapq.heappush(self.heap, val)  # <<
        if len(self.heap) > self.k:  # <<
            heapq.heappop(self.heap)
        return self.heap[0]  # <<
''',
  D("KthLargest", [(["KthLargest","add","add","add","add","add"], [[3,[4,5,8,2]],[3],[5],[10],[9],[4]], [None,4,5,5,8,8]),
                   (["KthLargest","add","add"], [[1,[]],[-3],[-2]], [None,-3,-2])])),

P("task_scheduler", 68, "Task Scheduler", "heap", "Medium",
  "CPU tasks (letters) with a cooldown of n between identical tasks. Return the minimum number of time units (idle allowed).",
  "The most frequent task sets the frame: (maxFreq - 1) blocks of size n + 1, plus one slot per task tied for maxFreq. If tasks overfill the frame, the answer is just len(tasks).",
  "Count how MANY tasks share the max frequency. A max-heap simulation also works if you can't recall the formula.",
  "O(n)", "O(1)",
  ["Can n be 0?"],
  ["n = 0 -> len(tasks)", "several tasks tied for max", "many distinct tasks (no idle)"],
  '''
def leastInterval(tasks, n):
    counts = Counter(tasks).values()
    max_f = max(counts)  # <<
    n_max = sum(1 for c in counts if c == max_f)  # <<
    return max(len(tasks), (max_f - 1) * (n + 1) + n_max)  # <<
''',
  F("leastInterval", [([["A","A","A","B","B","B"], 2], 8), ([["A","C","A","B","D","B"], 1], 6), ([["A","A","A","B","B","B"], 3], 10),
                      ([["A","A"], 0], 2)])),

P("design_twitter", 69, "Design Twitter", "heap", "Medium",
  "Design postTweet(user, tweet), follow, unfollow, and getNewsFeed(user): the 10 most recent tweet ids from the user and people they follow.",
  "Timestamp every tweet. The feed is a k-way merge of each followee's tweet list by time: a heap, taking the 10 largest.",
  "Include the user's own tweets. Unfollowing someone you don't follow must not crash (discard, not remove).",
  "O(F log F)", "O(users + tweets)",
  ["Does a user see their own tweets?", "Can a user follow themselves?"],
  ["feed with fewer than 10 tweets", "unfollow a non-followee", "more than 10 tweets"],
  '''
class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)
        self.follows = defaultdict(set)
    def postTweet(self, userId, tweetId):
        self.tweets[userId].append((self.time, tweetId))  # <<
        self.time += 1
    def getNewsFeed(self, userId):
        users = self.follows[userId] | {userId}  # <<
        heap = []
        for u in users:
            heap.extend(self.tweets[u][-10:])
        return [t for _, t in heapq.nlargest(10, heap)]  # <<
    def follow(self, followerId, followeeId):
        self.follows[followerId].add(followeeId)
    def unfollow(self, followerId, followeeId):
        self.follows[followerId].discard(followeeId)
''',
  D("Twitter", [(["Twitter","postTweet","getNewsFeed","follow","postTweet","getNewsFeed","unfollow","getNewsFeed"],
                 [[],[1,5],[1],[1,2],[2,6],[1],[1,2],[1]], [None,None,[5],None,None,[6,5],None,[5]])])),

P("median_finder", 70, "Find Median from Data Stream", "heap", "Hard",
  "Design addNum(num) and findMedian() over a stream.",
  "Two heaps: a max-heap for the lower half and a min-heap for the upper half, sizes kept within 1. The median sits at the tops.",
  "Route every number through lo then move lo's max to hi; rebalance so lo has the extra element. Negate for the max-heap.",
  "O(log n)", "O(n)",
  ["findMedian on an empty stream?", "Return a float?"],
  ["single number", "duplicates", "negative numbers"],
  '''
class MedianFinder:
    def __init__(self):
        self.lo = []
        self.hi = []
    def addNum(self, num):
        heapq.heappush(self.lo, -num)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))  # <<
        if len(self.hi) > len(self.lo):  # <<
            heapq.heappush(self.lo, -heapq.heappop(self.hi))
    def findMedian(self):
        if len(self.lo) > len(self.hi):
            return float(-self.lo[0])  # <<
        return (-self.lo[0] + self.hi[0]) / 2
''',
  D("MedianFinder", [(["MedianFinder","addNum","addNum","findMedian","addNum","findMedian"], [[],[1],[2],[],[3],[]],
                      [None,None,None,1.5,None,2.0]),
                     (["MedianFinder","addNum","findMedian","addNum","findMedian"], [[],[-1],[],[-2],[]], [None,None,-1.0,None,-1.5])])),
]
