import subprocess, os, tarfile, io

# Create a tar archive of scripts/ from git
result = subprocess.run(['git', 'archive', 'HEAD:scripts/'], capture_output=True)

if result.returncode != 0:
    print(f"Error: {result.stderr.decode()}")
else:
    # Extract the tar archive
    tar_data = io.BytesIO(result.stdout)
    with tarfile.open(fileobj=tar_data, mode='r|') as tar:
        for member in tar:
            tar.extract(member, path='.')
            print(f'Extracted: {member.name}')
    
    print(f'Done extracting scripts/')
