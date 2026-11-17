"""NeetCode 150 part B: remaining Backtracking, Graphs, Advanced Graphs."""
from .problems import P, F

_GRAPH_NODE = '''
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []
'''

_GRAPH_HARNESS = '''
def harness(fn, args):
    adj = args[0]
    if not adj:
        return [] if fn(None) is None else "expected None for empty graph"
    nodes = [ns['Node'](i + 1) for i in range(len(adj))]
    for i, nb in enumerate(adj):
        nodes[i].neighbors = [nodes[j - 1] for j in nb]
    old = set(map(id, nodes))
    root = fn(nodes[0])
    seen, stack = {}, [root]
    while stack:
        x = stack.pop()
        if id(x) in old:
            return "SHARED NODES (not a deep copy)"
        if x.val in seen:
            continue
        seen[x.val] = x
        stack.extend(x.neighbors)
    return [[nb.val for nb in seen[v].neighbors] for v in sorted(seen)]
'''

_I = 2147483647

PROBLEMS_B = [
P("subsets_ii", 74, "Subsets II", "backtracking", "Medium",
  "Return all subsets of nums, which may contain duplicates, without duplicate subsets.",
  "Sort, then run the Subsets backtracking but skip nums[i] when it equals nums[i-1] at the SAME level (i > start).",
  "The skip condition is i > start, not i > 0: taking the duplicate deeper in the path is allowed.",
  "O(n·2^n)", "O(n)",
  ["Output order matter?"],
  ["all duplicates [2,2,2]", "no duplicates", "single element"],
  '''
def subsetsWithDup(nums):
    nums.sort()  # <<
    res, path = [], []
    def bt(start):
        res.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:  # <<
                continue
            path.append(nums[i])
            bt(i + 1)  # <<
            path.pop()
    bt(0)
    return res
''',
  F("subsetsWithDup", [([[1,2,2]], [[],[1],[1,2],[1,2,2],[2],[2,2]]), ([[0]], [[],[0]]), ([[2,2]], [[],[2],[2,2]])],
    compare="unordered_nested")),

P("combination_sum_ii", 75, "Combination Sum II", "backtracking", "Medium",
  "Return unique combinations of candidates summing to target; each candidate used at most once; candidates may repeat.",
  "Sort. Backtrack with i + 1 (no reuse) and skip equal values at the same level (i > start). Break early once a candidate exceeds the remainder.",
  "`break` (not continue) is valid only because the list is sorted.",
  "O(2^n)", "O(n)",
  ["Can candidates contain duplicates?", "All positive?"],
  ["no combination", "duplicates forming different combos", "target equals one candidate"],
  '''
def combinationSum2(candidates, target):
    candidates.sort()
    res, path = [], []
    def bt(start, remain):
        if remain == 0:
            res.append(path[:])
            return
        for i in range(start, len(candidates)):
            if i > start and candidates[i] == candidates[i - 1]:  # <<
                continue
            if candidates[i] > remain:
                break  # <<
            path.append(candidates[i])
            bt(i + 1, remain - candidates[i])  # <<
            path.pop()
    bt(0, target)
    return res
''',
  F("combinationSum2", [([[10,1,2,7,6,1,5], 8], [[1,1,6],[1,2,5],[1,7],[2,6]]), ([[2,5,2,1,2], 5], [[1,2,2],[5]]), ([[3], 2], [])],
    compare="unordered_nested")),

P("palindrome_partitioning", 77, "Palindrome Partitioning", "backtracking", "Medium",
  "Return every way to split s into substrings that are all palindromes.",
  "At position i, try every prefix s[i:j]; if it's a palindrome, take it and recurse from j. Reaching the end = one valid partition.",
  "Recurse with j (the end of the piece), not i + 1.",
  "O(n·2^n)", "O(n)",
  [],
  ["single character", "whole string is a palindrome", "all same letters"],
  '''
def partition(s):
    res, path = [], []
    def bt(i):
        if i == len(s):
            res.append(path[:])  # <<
            return
        for j in range(i + 1, len(s) + 1):
            piece = s[i:j]
            if piece == piece[::-1]:  # <<
                path.append(piece)
                bt(j)  # <<
                path.pop()
    bt(0)
    return res
''',
  F("partition", [(["aab"], [["a","a","b"],["aa","b"]]), (["a"], [["a"]]), (["aa"], [["a","a"],["aa"]])], compare="unordered")),

P("letter_combinations", 78, "Letter Combinations of a Phone Number", "backtracking", "Medium",
  "Given digits 2-9, return all letter strings they could represent on a phone keypad.",
  "One recursion level per digit; branch over that digit's letters. Depth = len(digits).",
  "Empty input returns [] (not ['']).",
  "O(4^n·n)", "O(n)",
  ["Digits only 2-9?"],
  ["empty string", "digit 7 or 9 (four letters)", "single digit"],
  '''
def letterCombinations(digits):
    if not digits:
        return []  # <<
    phone = {'2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'}
    res = []
    def bt(i, cur):
        if i == len(digits):
            res.append(cur)
            return
        for ch in phone[digits[i]]:  # <<
            bt(i + 1, cur + ch)  # <<
    bt(0, '')
    return res
''',
  F("letterCombinations", [(["23"], ["ad","ae","af","bd","be","bf","cd","ce","cf"]), ([""], []), (["2"], ["a","b","c"])],
    compare="unordered")),

P("n_queens", 79, "N-Queens", "backtracking", "Hard",
  "Place n queens on an n x n board so none attack each other. Return all boards as lists of strings.",
  "One queen per row. Track used columns, diagonals (r - c) and anti-diagonals (r + c) in sets for O(1) safety checks.",
  "Undo all three set additions AND the board cell when backtracking.",
  "O(n!)", "O(n²)",
  ["Return boards or just a count?"],
  ["n = 1", "n = 2 or 3 (no solutions)"],
  '''
def solveNQueens(n):
    res = []
    board = [['.'] * n for _ in range(n)]
    cols, diag, anti = set(), set(), set()
    def bt(r):
        if r == n:
            res.append([''.join(row) for row in board])
            return
        for c in range(n):
            if c in cols or r - c in diag or r + c in anti:  # <<
                continue
            cols.add(c); diag.add(r - c); anti.add(r + c)
            board[r][c] = 'Q'
            bt(r + 1)  # <<
            cols.remove(c); diag.remove(r - c); anti.remove(r + c)  # <<
            board[r][c] = '.'
    bt(0)
    return res
''',
  F("solveNQueens", [([4], [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]), ([1], [["Q"]]), ([2], [])],
    compare="unordered")),

P("clone_graph", 81, "Clone Graph", "grid_graph", "Medium",
  "Deep-copy a connected undirected graph given one node. Node has .val and .neighbors.",
  "DFS with a map original -> clone. Register the clone BEFORE visiting neighbours so cycles return the existing clone.",
  "Return None for an empty graph. Never return or link original nodes.",
  "O(V + E)", "O(V)",
  ["Is the graph connected?", "Can it be empty?"],
  ["empty graph", "single node, no neighbours", "cycle"],
  '''
def cloneGraph(node):
    clones = {}
    def dfs(n):
        if n in clones:
            return clones[n]  # <<
        copy = Node(n.val)
        clones[n] = copy  # <<
        for nb in n.neighbors:
            copy.neighbors.append(dfs(nb))  # <<
        return copy
    return dfs(node) if node else None
''',
  F("cloneGraph", [([[[2,4],[1,3],[2,4],[1,3]]], [[2,4],[1,3],[2,4],[1,3]]), ([[[]]], [[]]), ([[]], [])],
    prelude=_GRAPH_NODE, harness=_GRAPH_HARNESS)),

P("pacific_atlantic", 83, "Pacific Atlantic Water Flow", "grid_graph", "Medium",
  "Water flows to neighbours of equal or lower height. Pacific touches top/left edges, Atlantic bottom/right. Return cells that can reach both.",
  "Reverse the flow: DFS UPHILL from each ocean's border cells to find everything that drains into it. Answer = intersection of the two sets.",
  "Moving uphill means you may enter a neighbour if it's >= the current height.",
  "O(m·n)", "O(m·n)",
  ["Output order?"],
  ["single cell", "flat grid (all cells qualify)", "single row"],
  '''
def pacificAtlantic(heights):
    R, C = len(heights), len(heights[0])
    pac, atl = set(), set()
    def dfs(r, c, seen, prev):
        if (r, c) in seen or r < 0 or c < 0 or r >= R or c >= C or heights[r][c] < prev:  # <<
            return
        seen.add((r, c))
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            dfs(r + dr, c + dc, seen, heights[r][c])
    for c in range(C):
        dfs(0, c, pac, 0)  # <<
        dfs(R - 1, c, atl, 0)
    for r in range(R):
        dfs(r, 0, pac, 0)
        dfs(r, C - 1, atl, 0)
    return [list(x) for x in pac & atl]  # <<
''',
  F("pacificAtlantic", [([[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]], [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]),
                        ([[[1]]], [[0,0]]), ([[[1,1],[1,1]]], [[0,0],[0,1],[1,0],[1,1]])], compare="unordered")),

P("surrounded_regions", 84, "Surrounded Regions", "grid_graph", "Medium",
  "Flip every 'O' region that is fully surrounded by 'X' into 'X' (in place). 'O's connected to the border survive.",
  "Invert the question: mark every 'O' reachable from the border as safe. Then flip all remaining 'O' to 'X' and restore the safe ones.",
  "Mark with a temporary letter so the final pass can tell safe from captured.",
  "O(m·n)", "O(m·n)",
  ["Modify in place?"],
  ["all 'O'", "single cell", "'O' region touching the border"],
  '''
def solve(board):
    R, C = len(board), len(board[0])
    def mark(r, c):
        if r < 0 or c < 0 or r >= R or c >= C or board[r][c] != 'O':
            return
        board[r][c] = 'S'  # <<
        mark(r + 1, c); mark(r - 1, c); mark(r, c + 1); mark(r, c - 1)
    for r in range(R):
        for c in range(C):
            if (r in (0, R - 1) or c in (0, C - 1)) and board[r][c] == 'O':  # <<
                mark(r, c)
    for r in range(R):
        for c in range(C):
            board[r][c] = 'O' if board[r][c] == 'S' else 'X'  # <<
''',
  F("solve", [([[["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]],
               [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]),
              ([[["X"]]], [["X"]]), ([[["O","O"],["O","O"]]], [["O","O"],["O","O"]])], inplace=0)),

P("walls_and_gates", 86, "Walls and Gates", "grid_graph", "Medium",
  "Grid of -1 (wall), 0 (gate), INF=2147483647 (empty room). Fill each room in place with its distance to the nearest gate.",
  "Multi-source BFS starting from ALL gates at once; the first time BFS reaches a room is its shortest distance.",
  "Only enter cells that are still INF: that doubles as the visited check.",
  "O(m·n)", "O(m·n)",
  ["Can a room be unreachable (stays INF)?"],
  ["no gates", "room walled off", "all gates"],
  '''
def wallsAndGates(rooms):
    R, C = len(rooms), len(rooms[0])
    q = deque((r, c) for r in range(R) for c in range(C) if rooms[r][c] == 0)  # <<
    while q:
        r, c = q.popleft()
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C and rooms[nr][nc] == 2147483647:  # <<
                rooms[nr][nc] = rooms[r][c] + 1  # <<
                q.append((nr, nc))
''',
  F("wallsAndGates", [([[[_I,-1,0,_I],[_I,_I,_I,-1],[_I,-1,_I,-1],[0,-1,_I,_I]]], [[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]),
                      ([[[-1]]], [[-1]]), ([[[0,_I]]], [[0,1]]), ([[[_I,-1,0]]], [[_I,-1,0]])], inplace=0)),

P("course_schedule_ii", 88, "Course Schedule II", "topo_sort", "Medium",
  "Return any valid order to take numCourses given prerequisites [a, b] (b before a), or [] if impossible.",
  "Kahn's algorithm: the order you pop zero-indegree courses IS a valid order. If not all courses get popped, there's a cycle.",
  "Return [] (not a partial order) when there's a cycle. Any valid order is accepted.",
  "O(V + E)", "O(V + E)",
  ["Any valid order acceptable?"],
  ["no prerequisites", "cycle", "several independent chains"],
  '''
def findOrder(numCourses, prerequisites):
    adj = defaultdict(list)
    indeg = [0] * numCourses
    for a, b in prerequisites:
        adj[b].append(a)  # <<
        indeg[a] += 1
    q = deque(i for i in range(numCourses) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)  # <<
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == numCourses else []  # <<
''',
  F("findOrder", [([2, [[1,0]]], "VALID"), ([4, [[1,0],[2,0],[3,1],[3,2]]], "VALID"), ([1, []], "VALID"), ([2, [[1,0],[0,1]]], "IMPOSSIBLE")],
    harness='''
def harness(fn, args):
    n, pre = args
    res = fn(n, [p[:] for p in pre])
    if res == []:
        return "IMPOSSIBLE"
    if sorted(res) != list(range(n)):
        return "not a permutation of all courses: " + str(res)
    pos = {c: i for i, c in enumerate(res)}
    return "VALID" if all(pos[b] < pos[a] for a, b in pre) else "ORDER BREAKS A PREREQUISITE: " + str(res)
''')),

P("graph_valid_tree", 89, "Graph Valid Tree", "union_find", "Medium",
  "Given n nodes and undirected edges, return True if they form a valid tree.",
  "A tree has exactly n - 1 edges and no cycle. Check the count, then union every edge; a union of two nodes already connected means a cycle.",
  "With exactly n - 1 edges and no cycle, the graph is automatically connected.",
  "O(n·α(n))", "O(n)",
  ["Can edges repeat?", "Is n = 1 with no edges a tree?"],
  ["single node", "right edge count but a cycle + disconnected part", "too many edges"],
  '''
def validTree(n, edges):
    if len(edges) != n - 1:
        return False  # <<
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False  # <<
        parent[ra] = rb  # <<
    return True
''',
  F("validTree", [([5, [[0,1],[0,2],[0,3],[1,4]]], True), ([5, [[0,1],[1,2],[2,3],[1,3],[1,4]]], False), ([1, []], True),
                  ([4, [[0,1],[2,3],[1,0]]], False)])),

P("word_ladder", 92, "Word Ladder", "tree_bfs", "Hard",
  "Return the number of words in the shortest transformation from beginWord to endWord, changing one letter at a time, every word in wordList. 0 if impossible.",
  "Shortest path in an unweighted graph -> BFS. Neighbours of a word: change each position to each letter and keep those in the word set.",
  "Mark words visited when ENQUEUED. Count words, not edges (start at 1). endWord must be in the list.",
  "O(n·L·26)", "O(n)",
  ["Is beginWord in the list?", "All words same length?"],
  ["endWord not in list -> 0", "beginWord one step from endWord", "no path"],
  '''
def ladderLength(beginWord, endWord, wordList):
    words = set(wordList)
    if endWord not in words:
        return 0
    q = deque([(beginWord, 1)])
    seen = {beginWord}
    while q:
        w, d = q.popleft()
        if w == endWord:
            return d  # <<
        for i in range(len(w)):
            for ch in 'abcdefghijklmnopqrstuvwxyz':
                nxt = w[:i] + ch + w[i + 1:]  # <<
                if nxt in words and nxt not in seen:  # <<
                    seen.add(nxt)
                    q.append((nxt, d + 1))
    return 0
''',
  F("ladderLength", [(["hit","cog",["hot","dot","dog","lot","log","cog"]], 5), (["hit","cog",["hot","dot","dog","lot","log"]], 0),
                     (["a","c",["a","b","c"]], 2)])),

P("reconstruct_itinerary", 93, "Reconstruct Itinerary", "shortest_path", "Hard",
  "Use every ticket [from, to] exactly once, starting at JFK. Return the lexically smallest itinerary.",
  "Eulerian path (Hierholzer): DFS always taking the smallest destination, removing edges as you use them; append an airport AFTER its edges are exhausted, then reverse.",
  "Sort destinations in reverse so pop() gives the smallest. Post-order append is what handles dead ends.",
  "O(E log E)", "O(E)",
  ["Is a valid itinerary guaranteed?"],
  ["dead-end branch that must be taken last", "repeated tickets", "single ticket"],
  '''
def findItinerary(tickets):
    adj = defaultdict(list)
    for a, b in sorted(tickets, reverse=True):  # <<
        adj[a].append(b)
    route = []
    def dfs(a):
        while adj[a]:
            dfs(adj[a].pop())  # <<
        route.append(a)  # <<
    dfs('JFK')
    return route[::-1]
''',
  F("findItinerary", [([[["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]], ["JFK","MUC","LHR","SFO","SJC"]),
                      ([[["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"],["ATL","SFO"]]], ["JFK","ATL","JFK","SFO","ATL","SFO"]),
                      ([[["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]], ["JFK","NRT","JFK","KUL"])])),

P("min_cost_connect", 94, "Min Cost to Connect All Points", "shortest_path", "Medium",
  "Connect all points with minimum total Manhattan distance (any point can connect to any other).",
  "Minimum spanning tree with Prim: grow from point 0, always adding the cheapest edge to an unvisited point via a min-heap.",
  "Skip heap entries for points already in the tree (lazy deletion). Total = sum of the n accepted costs.",
  "O(n² log n)", "O(n²)",
  [],
  ["single point -> 0", "two points", "collinear points"],
  '''
def minCostConnectPoints(points):
    n = len(points)
    seen = set()
    heap = [(0, 0)]
    total = 0
    while len(seen) < n:
        cost, i = heapq.heappop(heap)
        if i in seen:
            continue  # <<
        seen.add(i)
        total += cost  # <<
        xi, yi = points[i]
        for j in range(n):
            if j not in seen:
                heapq.heappush(heap, (abs(xi - points[j][0]) + abs(yi - points[j][1]), j))  # <<
    return total
''',
  F("minCostConnectPoints", [([[[0,0],[2,2],[3,10],[5,2],[7,0]]], 20), ([[[3,12],[-2,5],[-4,1]]], 18), ([[[0,0]]], 0)])),

P("network_delay", 95, "Network Delay Time", "shortest_path", "Medium",
  "Directed weighted edges times[i] = (u, v, w), nodes 1..n. A signal starts at k. Return the time until all nodes receive it, or -1.",
  "Dijkstra from k; the answer is the largest shortest distance. If some node is never reached, -1.",
  "Finalise a node the first time it's popped; skip later (stale) pops.",
  "O(E log V)", "O(V + E)",
  ["Nodes 1-indexed?", "Non-negative weights?"],
  ["unreachable node -> -1", "single node", "multiple edges between the same pair"],
  '''
def networkDelayTime(times, n, k):
    adj = defaultdict(list)
    for u, v, w in times:
        adj[u].append((v, w))
    dist = {}
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:
            continue  # <<
        dist[u] = d  # <<
        for v, w in adj[u]:
            if v not in dist:
                heapq.heappush(heap, (d + w, v))  # <<
    return max(dist.values()) if len(dist) == n else -1
''',
  F("networkDelayTime", [([[[2,1,1],[2,3,1],[3,4,1]], 4, 2], 2), ([[[1,2,1]], 2, 1], 1), ([[[1,2,1]], 2, 2], -1)])),

P("swim_rising_water", 96, "Swim in Rising Water", "shortest_path", "Hard",
  "grid[r][c] is an elevation; at time t you can swim through cells with elevation <= t. Return the least t to get from top-left to bottom-right.",
  "Dijkstra where a path's cost is its MAXIMUM cell, not the sum. Pop the lowest-max frontier cell until you reach the corner.",
  "Push max(t, grid[nr][nc]). Mark visited when pushing.",
  "O(n² log n)", "O(n²)",
  [],
  ["1 x 1 grid", "start cell is the highest", "spiral path"],
  '''
def swimInWater(grid):
    n = len(grid)
    heap = [(grid[0][0], 0, 0)]
    seen = {(0, 0)}
    while heap:
        t, r, c = heapq.heappop(heap)
        if r == c == n - 1:
            return t  # <<
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen:
                seen.add((nr, nc))  # <<
                heapq.heappush(heap, (max(t, grid[nr][nc]), nr, nc))  # <<
''',
  F("swimInWater", [([[[0,2],[1,3]]], 3), ([[[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]]], 16), ([[[0]]], 0)])),

P("alien_dictionary", 97, "Alien Dictionary", "topo_sort", "Hard",
  "Words are sorted in an unknown alphabet. Return any letter order consistent with them, or '' if impossible.",
  "Compare adjacent words: the first differing letters give an edge x -> y. Topologically sort all letters; a cycle means ''.",
  "Prefix trap: if a longer word comes before its own prefix ('abc' before 'ab'), return ''. Include letters with no edges.",
  "O(total chars)", "O(1)",
  ["Any valid order acceptable?", "Lowercase letters only?"],
  ["prefix ordering violation", "single word", "contradiction cycle"],
  '''
def alienOrder(words):
    adj = {c: set() for w in words for c in w}
    indeg = {c: 0 for c in adj}
    for a, b in zip(words, words[1:]):
        for x, y in zip(a, b):
            if x != y:
                if y not in adj[x]:
                    adj[x].add(y)  # <<
                    indeg[y] += 1
                break
        else:
            if len(a) > len(b):
                return ""  # <<
    q = deque(c for c in indeg if indeg[c] == 0)
    order = []
    while q:
        c = q.popleft()
        order.append(c)
        for d in adj[c]:
            indeg[d] -= 1
            if indeg[d] == 0:  # <<
                q.append(d)
    return ''.join(order) if len(order) == len(adj) else ""
''',
  F("alienOrder", [([["wrt","wrf","er","ett","rftt"]], "VALID"), ([["z","x"]], "VALID"), ([["z","x","z"]], ""), ([["abc","ab"]], ""),
                   ([["ab"]], "VALID")],
    harness='''
def harness(fn, args):
    words = args[0]
    res = fn(list(words))
    if res == "":
        return ""
    letters = {c for w in words for c in w}
    if sorted(res) != sorted(letters):
        return "wrong letter set: " + res
    rank = {c: i for i, c in enumerate(res)}
    key = lambda w: [rank[c] for c in w]
    return "VALID" if all(key(a) <= key(b) for a, b in zip(words, words[1:])) else "ORDER CONTRADICTS WORDS: " + res
''')),

P("cheapest_flights", 98, "Cheapest Flights Within K Stops", "shortest_path", "Medium",
  "Return the cheapest price from src to dst using at most k stops, or -1.",
  "Bellman-Ford limited to k + 1 rounds (k stops = k + 1 edges). Each round relaxes every flight using LAST round's prices.",
  "Relax from a COPY of the previous prices; updating in place lets one round chain several edges and breaks the stop limit.",
  "O(k·E)", "O(n)",
  ["Is k the number of stops (edges = k + 1)?"],
  ["k = 0 (direct only)", "cheaper path needs too many stops", "unreachable"],
  '''
def findCheapestPrice(n, flights, src, dst, k):
    prices = [float('inf')] * n
    prices[src] = 0
    for _ in range(k + 1):  # <<
        tmp = prices[:]  # <<
        for u, v, w in flights:
            if prices[u] + w < tmp[v]:  # <<
                tmp[v] = prices[u] + w
        prices = tmp
    return prices[dst] if prices[dst] != float('inf') else -1
''',
  F("findCheapestPrice", [([4, [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], 0, 3, 1], 700),
                          ([3, [[0,1,100],[1,2,100],[0,2,500]], 0, 2, 1], 200), ([3, [[0,1,100],[1,2,100],[0,2,500]], 0, 2, 0], 500),
                          ([3, [[0,1,100]], 0, 2, 1], -1)])),
]
