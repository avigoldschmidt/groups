#!/usr/bin/env python3
import csv
import random
import sys
from typing import List, Set

def read_csv_file(filename: str) -> tuple[List[List[str]], Set[tuple[str, str]]]:
    """
    Read the CSV file and extract participants by column and restrictions.
    
    CSV Format:
    - First row: headers
    - Columns with participants (bunks/groups)
    - After an empty column, restriction columns (people who shouldn't be together)
    
    Returns:
        participants_by_column: List of lists, each containing participants from one column
        restrictions: Set of tuples representing people who shouldn't be together
    """
    participants_by_column = []
    restrictions = set()
    
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        rows = list(reader)
        
        if not rows:
            return participants_by_column, restrictions
        
        # Find where participant columns end and restriction columns begin
        # Look for the first completely empty column as a separator
        header_row = rows[0]
        participant_columns = []
        restriction_start = len(header_row)
        
        for i, cell in enumerate(header_row):
            if cell.strip():
                participant_columns.append(i)
            elif participant_columns:  # Found empty column after some filled columns
                restriction_start = i + 1
                break
        
        # If no empty column found, assume all columns are participant columns
        if restriction_start == len(header_row):
            participant_columns = list(range(len(header_row)))
            restriction_start = len(header_row)
        
        # Initialize participant lists
        participants_by_column = [[] for _ in participant_columns]
        
        # Extract participants from participant columns
        for row in rows[1:]:  # Skip header
            for i, col_idx in enumerate(participant_columns):
                if col_idx < len(row) and row[col_idx].strip():
                    participants_by_column[i].append(row[col_idx].strip())
        
        # Extract restrictions from restriction columns
        for row in rows[1:]:  # Skip header
            if len(row) > restriction_start:
                row_restrictions = [name.strip() for name in row[restriction_start:] if name.strip()]
                if len(row_restrictions) > 1:
                    # Create pairs from this row
                    for i in range(len(row_restrictions)):
                        for j in range(i + 1, len(row_restrictions)):
                            if row_restrictions[i] and row_restrictions[j]:
                                restrictions.add((row_restrictions[i], row_restrictions[j]))
    
    return participants_by_column, restrictions

def count_violations(group: List[str], restrictions: Set[tuple[str, str]]) -> int:
    """
    Count the number of restriction violations in a group.
    
    Returns:
        Number of restriction pairs violated in this group
    """
    violations = 0
    for i in range(len(group)):
        for j in range(i + 1, len(group)):
            if (group[i], group[j]) in restrictions or (group[j], group[i]) in restrictions:
                violations += 1
    return violations

def check_restrictions(group: List[str], restrictions: Set[tuple[str, str]]) -> bool:
    """
    Check if a group violates any restrictions.
    
    Returns:
        True if group is valid (no restrictions violated)
        False if group violates restrictions
    """
    return count_violations(group, restrictions) == 0

def create_random_groups(participants_by_column: List[List[str]], num_groups: int, restrictions: Set[tuple[str, str]], max_attempts: int = 5000) -> List[List[str]]:
    """
    Create random groups while maintaining proportional representation from each column.
    
    Args:
        participants_by_column: List of lists, each containing participants from one column
        num_groups: Number of groups to create
        restrictions: Set of restriction pairs
        max_attempts: Maximum attempts to find valid grouping
    
    Returns:
        List of groups (each group is a list of names)
    """
    best_groups = None
    best_violations = float('inf')
    
    # Calculate how many people from each column should go to each group
    column_distributions = []
    for column in participants_by_column:
        column_size = len(column)
        base_per_group = column_size // num_groups
        remainder = column_size % num_groups
        
        # Distribute people from this column across groups
        distribution = [base_per_group] * num_groups
        for i in range(remainder):
            distribution[i] += 1
        
        column_distributions.append(distribution)
    
    # If no restrictions, just return proportional groups
    all_participants = [person for column in participants_by_column for person in column]
    if not restrictions:
        # Shuffle each column separately
        shuffled_columns = []
        for column in participants_by_column:
            shuffled_column = column.copy()
            random.shuffle(shuffled_column)
            shuffled_columns.append(shuffled_column)
        
        # Create groups with proportional representation
        groups = [[] for _ in range(num_groups)]
        
        for column_idx, shuffled_column in enumerate(shuffled_columns):
            start_idx = 0
            for group_idx in range(num_groups):
                count = column_distributions[column_idx][group_idx]
                end_idx = start_idx + count
                groups[group_idx].extend(shuffled_column[start_idx:end_idx])
                start_idx = end_idx
        
        return groups
    
    for attempt in range(max_attempts):
        # Shuffle each column separately
        shuffled_columns = []
        for column in participants_by_column:
            shuffled_column = column.copy()
            random.shuffle(shuffled_column)
            shuffled_columns.append(shuffled_column)
        
        # Create groups with proportional representation
        groups = [[] for _ in range(num_groups)]
        
        for column_idx, shuffled_column in enumerate(shuffled_columns):
            start_idx = 0
            for group_idx in range(num_groups):
                count = column_distributions[column_idx][group_idx]
                end_idx = start_idx + count
                groups[group_idx].extend(shuffled_column[start_idx:end_idx])
                start_idx = end_idx
        
        # Count total violations across all groups
        total_violations = 0
        for group in groups:
            total_violations += count_violations(group, restrictions)
        
        # If perfect solution found, return it
        if total_violations == 0:
            return groups
        
        # Keep track of best solution so far
        if total_violations < best_violations:
            best_violations = total_violations
            best_groups = groups.copy()
    
    if best_violations > 0:
        pass  # Silently use best solution found
    
    return best_groups

def print_groups(groups: List[List[str]], restrictions: Set[tuple[str, str]]):
    """Print the groups in a simple format for copying to Google Docs."""
    for i, group in enumerate(groups, 1):
        print(f"Group {i}:")
        for person in group:
            print(person)
        print()  # Empty line between groups

def main():
    if len(sys.argv) != 3:
        print("Usage: python groups.py <csv_file> <number_of_groups>")
        print("CSV Format:")
        print("  - First row: headers")
        print("  - Columns with participants (e.g., bunks/teams)")
        print("  - After an empty column, restriction columns (people who shouldn't be together)")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    try:
        num_groups = int(sys.argv[2])
    except ValueError:
        print("Error: Number of groups must be a valid integer!")
        sys.exit(1)
    
    try:
        participants_by_column, restrictions = read_csv_file(csv_file)
        
        # Flatten the participants list to check total count
        all_participants = [person for column in participants_by_column for person in column]
        
        if not all_participants:
            print("Error: No participants found in CSV file!")
            sys.exit(1)
        
        if num_groups <= 0:
            print("Error: Number of groups must be positive!")
            sys.exit(1)
        
        if num_groups > len(all_participants):
            print(f"Error: Cannot create {num_groups} groups with only {len(all_participants)} participants!")
            sys.exit(1)
        
        groups = create_random_groups(participants_by_column, num_groups, restrictions)
        print_groups(groups, restrictions)
        
    except FileNotFoundError:
        print(f"Error: Could not find file '{csv_file}'")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()