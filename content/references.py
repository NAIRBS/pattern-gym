"""Reference tables for the Cheatsheet's Costs and Method sections.

Costs are average case and the notes are written for Python. The method is the interview routine for both
online assessments and live, blank-page interviews (CoderPad and the like).
"""

# [structure, access, search, insert, delete, note]   ("—" = not a supported operation)
DS_COSTS = [
    ("Array / list (index)", "O(1)", "O(n)", "O(n)", "O(n)", "Reading `a[i]` is free. Inserting or deleting in the middle shifts everything after it."),
    ("List: append / pop at the end", "O(1)", "O(n)", "O(1)", "O(1)", "Append is O(1) amortized: the list grows by doubling. `pop(0)` and `insert(0, x)` are O(n); use a deque."),
    ("String", "O(1)", "O(n)", "O(n)", "O(n)", "Immutable: every change builds a new string. Collect pieces in a list and `''.join` them once."),
    ("Hash map / set (dict, set)", "—", "O(1)", "O(1)", "O(1)", "Average case; collisions make the worst case O(n). Keys must be hashable: tuples, not lists."),
    ("Linked list", "O(n)", "O(n)", "O(1)", "O(1)", "Insert and delete are O(1) once you hold the node before it. A dummy head removes the head special case."),
    ("Stack (list)", "O(1)", "O(n)", "O(1)", "O(1)", "Top only: push is `append`, pop is `pop()`. Nesting, undo, \"most recent unmatched\"."),
    ("Queue / deque", "O(1)", "O(n)", "O(1)", "O(1)", "`collections.deque`: O(1) at both ends. The BFS queue; also the sliding-window maximum."),
    ("Binary heap (heapq)", "O(1)", "O(n)", "O(log n)", "O(log n)", "Peek the min with `h[0]`; pop it in O(log n). `heapify` builds one in O(n). Push `-x` for a max-heap."),
    ("Balanced BST", "O(log n)", "O(log n)", "O(log n)", "O(log n)", "Keeps keys sorted. Python has none built in: `bisect` on a sorted list (O(n) inserts) or `sortedcontainers`."),
    ("Trie", "—", "O(L)", "O(L)", "O(L)", "L = the word's length, however many words are stored."),
    ("Union-Find", "—", "O(α(n))", "O(α(n))", "—", "Find and union with path compression and union by rank: effectively constant."),
]

# [algorithm, time, extra space, note]
ALGO_COSTS = [
    ("Binary search", "O(log n)", "O(1)", "Sorted input, or any yes/no question whose answer flips once (binary search on the answer)."),
    ("Built-in sort (Timsort)", "O(n log n)", "O(n)", "Stable. Sorting first often unlocks two pointers, greedy or a sweep."),
    ("Merge sort", "O(n log n)", "O(n)", "Stable; the usual way to sort a linked list."),
    ("Quicksort", "O(n log n)", "O(log n)", "Average case; worst O(n²). Quickselect finds the kth element in O(n) average."),
    ("Heapsort", "O(n log n)", "O(1)", "In place, not stable."),
    ("Counting / bucket sort", "O(n + k)", "O(n + k)", "Only when the value range k is small. Top K Frequent's buckets use this idea."),
    ("BFS / DFS", "O(V + E)", "O(V)", "A grid is a graph: V = rows × cols, E ≈ 4V."),
    ("Topological sort", "O(V + E)", "O(V)", "Directed acyclic graphs only. Nodes left over mean there's a cycle."),
    ("Dijkstra (with a heap)", "O((V + E) log V)", "O(V)", "Non-negative weights only. With negative weights it's Bellman-Ford, O(V·E)."),
    ("Union-Find, m operations", "O(m α(n))", "O(n)", "Near-linear. Kruskal's minimum spanning tree is a sort plus Union-Find."),
    ("Subsets (backtracking)", "O(n · 2ⁿ)", "O(n)", "Each element is in or out; copying each subset costs n."),
    ("Permutations", "O(n · n!)", "O(n)", "Only workable for n up to about 10."),
    ("1D DP", "O(n)", "O(n)", "Space often drops to O(1) by keeping just the last one or two values."),
    ("2D DP (e.g. LCS, edit distance)", "O(n · m)", "O(n · m)", "Space often drops to one row."),
]

# The interview routine, from reading the problem to a tested program.
STEPS = [
    ("Listen", "Note every detail. \"Sorted\", \"distinct\", \"in place\" or the size limits are there for a reason, and you'll probably need them."),
    ("Example", "Write an example that's big enough and not a special case. Most bad starts come from a tiny or symmetric example."),
    ("Brute force", "Say the brute force and its runtime early, even if it's terrible. It's a starting point and proves you can solve it."),
    ("Optimize", "Go through the techniques below (bottlenecks, unnecessary work, duplicated work first) and check the input size for the runtime you need."),
    ("Walk through", "Before typing, make sure you know exactly how the approach works on your example, step by step."),
    ("Implement", "On a blank page write the whole runnable program: imports, any helper class (`ListNode`, `TreeNode`), the function, and a few calls that print or `assert` results. In an OA, read stdin and print exactly the expected format."),
    ("Test", "Run it on your example, then on edge cases: empty, one element, duplicates, negatives, the largest size. Trace by hand where you can't run. Fix bugs deliberately, not by tweaking until it passes."),
]

# What to try when the brute force is too slow.
OPTIMIZE = [
    ("Bottlenecks", "The step that dominates the runtime; speeding anything else up won't help. Two Sum's bottleneck is the inner search, and a hash map makes it O(1)."),
    ("Unnecessary work", "Work whose result you could compute instead of search for, such as a third loop that hunts for the one value that would complete an equation."),
    ("Duplicated work", "The same thing computed again and again: the same subproblem (DP), the same range sum (prefix sums), the same window (sliding window)."),
    ("Do it by hand", "Solve a large example yourself without thinking about algorithms. Your intuition often uses the efficient method; then write down what you did."),
    ("Simplify, then generalize", "Solve an easier version (one character instead of a word, no duplicates), then extend that solution to the real problem."),
    ("Base case and build", "Solve n = 1, then build n = 2 from it, then n = 3. This often leads straight to a recursive or DP solution."),
    ("Data structure brainstorm", "Run through hash map, heap, stack, queue, tree, trie and ask what each would make cheap."),
    ("Best possible runtime", "The best any solution could do, usually O(size of the input) because you must read it. If you're already there, stop optimizing time."),
    ("Trade space for time", "Store something (a seen set, a precomputed table) to avoid recomputing it. Usually the biggest single win."),
]
