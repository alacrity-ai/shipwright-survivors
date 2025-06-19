import os
import json
import sys

def find_json_files(directory):
    json_files = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith('.json'):
                json_files.append(os.path.join(root, file))
    return json_files

def has_engine(blocks):
    return any('id' in block and 'engine' in block['id'].lower() for block in blocks)

def process_json_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)

        if 'blocks' not in json_data or not isinstance(json_data['blocks'], list):
            print(f"Skipping {file_path}: No blocks array found")
            return False

        if 'behavior' in json_data:
            print(f"Skipping {file_path}: Behavior already exists")
            return False

        behavior_type = 'default' if has_engine(json_data['blocks']) else 'spaceStation'
        json_data['behavior'] = {'type': behavior_type}

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2)

        print(f'Updated {file_path}: Added behavior type "{behavior_type}"')
        return True

    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        return False

def main():
    if len(sys.argv) != 2:
        print('Usage: python script.py <folder_path>')
        sys.exit(1)

    folder_path = sys.argv[1]

    if not os.path.exists(folder_path):
        print(f'Folder does not exist: {folder_path}')
        sys.exit(1)

    if not os.path.isdir(folder_path):
        print(f'Path is not a directory: {folder_path}')
        sys.exit(1)

    print(f'Processing JSON files in: {folder_path}')
    json_files = find_json_files(folder_path)
    print(f'Found {len(json_files)} JSON files')

    if not json_files:
        print('No JSON files found in the specified directory')
        return

    processed_count = 0
    skipped_count = 0

    for file_path in json_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)

            if isinstance(json_data.get('blocks'), list) and 'behavior' not in json_data:
                if process_json_file(file_path):
                    processed_count += 1
                else:
                    skipped_count += 1
            else:
                skipped_count += 1

        except Exception as e:
            print(f"Error reading {file_path}: {str(e)}")
            skipped_count += 1

    print('\nProcessing complete:')
    print(f'- Files processed: {processed_count}')
    print(f'- Files skipped: {skipped_count}')

if __name__ == '__main__':
    main()
