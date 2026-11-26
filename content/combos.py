"""Problems that need two patterns at once.

Real interviews often combine patterns: a binary search whose check is a greedy pass, a hash map that
finds nodes in a linked list. A problem's main pattern is its `pattern`; this adds the second one.
Study's "Combined problems" practice picks from these once you've done both lessons, and the reveal
after a mystery solve names both. validate.py checks every id here exists.

Each entry: problem id -> (second pattern id, how the two fit together in one sentence).
"""

COMBOS = {
    "koko": ("greedy", "Binary search on the eating speed; for each speed, one greedy pass counts the hours it needs."),
    "top_k_frequent": ("heap", "A hash map counts each number, then a heap of size k (or buckets by count) keeps the k most frequent."),
    "lru_cache": ("hashmap", "A hash map finds a key's node in O(1); a doubly linked list keeps the order of use, so the oldest is at one end."),
    "time_map": ("hashmap", "A hash map from key to its list of (timestamp, value); binary search finds the latest timestamp not after the query."),
    "word_search_ii": ("backtracking", "Put every word in a trie, then backtrack over the grid, following the trie so all words are searched at once."),
    "task_scheduler": ("greedy", "Count tasks, then always run the most frequent task that's ready: a max-heap plus a queue of tasks cooling down."),
    "merge_k_lists": ("linked_list", "A min-heap holds the current head of each list; pop the smallest, link it on, push its next node."),
    "swim_rising_water": ("grid_graph", "The grid is a graph of cells; Dijkstra with a min-heap where a path's cost is the highest cell on it."),
    "min_window": ("hashmap", "Hash maps count what the window has against what it needs, which tells the sliding window when it's valid."),
    "longest_increasing_path": ("grid_graph", "DFS from each cell over the grid, remembering each cell's answer so it's worked out once."),
    "word_ladder": ("hashmap", "BFS over words; a map from patterns like h*t to their words finds each word's neighbours fast."),
    "min_interval_query": ("heap", "Sort intervals and queries; a min-heap by size holds the intervals that cover the current query."),
    "meeting_rooms_ii": ("intervals", "Sort meetings by start; a min-heap of end times says whether the earliest room is free again."),
    "partition_labels": ("hashmap", "A hash map of each letter's last index; greedily extend the current part to the furthest last index seen."),
    "hand_of_straights": ("hashmap", "Count cards in a hash map, then greedily build each group from the smallest card left."),
    "design_twitter": ("hashmap", "Hash maps of who follows whom and of each user's tweets; a heap merges the newest tweets across them."),
    "detect_squares": ("hashmap", "Count points in a hash map; for each point that could be the diagonal corner, multiply the counts of the other two."),
    "sliding_window_max": ("sliding_window", "Slide a window over the array; a deque kept in decreasing order holds the window's maximum at its front."),
    "copy_random_list": ("hashmap", "A hash map from each old node to its copy lets the random pointers be wired in a second pass."),
    "clone_graph": ("hashmap", "A hash map from each old node to its clone stops the graph walk from copying a node twice."),
}
