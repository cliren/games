// Question 1. First character that appears exactly once.
// aabbcdeeff -> c
// Count every character, then walk the line again and return the first
// whose count is 1. The second walk keeps left-to-right order.
// No unique character is an empty optional. A missing line is an error.
// Time grows with the length of the line. Memory grows with distinct characters.

#include <optional>
#include <stdexcept>
#include <string>
#include <unordered_map>

std::optional<char> firstUnique(const std::string* line) {
    if (line == nullptr) {
        throw std::invalid_argument("line is required");
    }
    std::unordered_map<char, int> counts;
    for (char c : *line) {
        counts[c] += 1;
    }
    for (char c : *line) {
        if (counts[c] == 1) {
            return c;
        }
    }
    return std::nullopt;
}
