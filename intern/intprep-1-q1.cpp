// Question 1. First character that appears exactly once.
// aabbcdeeff -> c
// "A a b B c!" -> c   (challenge 1)
// Time: a hit does not rescan. A miss scans twice.
// Memory: bounded by the cache cap (100 lines).

#include <cctype>
#include <list>
#include <optional>
#include <stdexcept>
#include <string>
#include <unordered_map>

class FirstUnique {
public:
    static constexpr std::size_t kCap = 100;

    // Challenge 2. Finding is its own method. A missing line throws.
    // No unique character is an empty optional, not an error.
    std::optional<char> firstUnique(const std::string* line) {
        if (line == nullptr) {
            throw std::invalid_argument("line is required");
        }

        // Challenge 3. Answer from memory. Remember at most kCap lines.
        // Forgetting drops the least recently used line.
        // A saved empty optional is a real answer, not a cache miss.
        // Lookup counts as use. A mere existence check would not.
        auto cached = cache_.find(*line);
        if (cached != cache_.end()) {
            touch(cached->second);
            return cached->second.answer;
        }

        // Challenge 2. Counting is its own method. The finder does not recount.
        auto counts = countLetters(*line);
        std::optional<char> answer = findFirst(counts, *line);

        remember(*line, answer);
        return answer;
    }

private:
    struct Entry {
        std::string line;
        std::optional<char> answer;
        std::list<std::string>::iterator order;
    };

    // Challenge 1. Only letters count. Upper and lower are the same letter.
    // The key is folded. The returned character keeps its original case.
    // Challenge 2. This is the only place the counting rule lives.
    static std::unordered_map<char, int> countLetters(const std::string& line) {
        std::unordered_map<char, int> counts;
        for (unsigned char c : line) {
            if (!std::isalpha(c)) continue;
            counts[static_cast<char>(std::tolower(c))] += 1;
        }
        return counts;
    }

    // Challenge 1. Skip spaces and punctuation on the second walk too.
    // Return the character from the line, not the lowercased key.
    static std::optional<char> findFirst(
        const std::unordered_map<char, int>& counts,
        const std::string& line) {
        for (unsigned char c : line) {
            if (!std::isalpha(c)) continue;
            char key = static_cast<char>(std::tolower(c));
            if (counts.at(key) == 1) {
                return static_cast<char>(c);
            }
        }
        return std::nullopt;
    }

    // Challenge 3. Store the answer, including "none".
    // When full, drop the line at the back of the use-order list.
    void remember(const std::string& line, std::optional<char> answer) {
        order_.push_front(line);
        cache_[line] = Entry{line, answer, order_.begin()};
        if (cache_.size() > kCap) {
            cache_.erase(order_.back());
            order_.pop_back();
        }
    }

    // Challenge 3. A hit moves this line to most recently used.
    void touch(Entry& entry) {
        order_.erase(entry.order);
        order_.push_front(entry.line);
        entry.order = order_.begin();
    }

    std::unordered_map<std::string, Entry> cache_;
    std::list<std::string> order_;
};
