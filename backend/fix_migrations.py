import os
import glob

migration_files = glob.glob(r"c:\Users\csepr\OneDrive\Desktop\Flexispace\backend\alembic\versions\*.py")

for file_path in migration_files:
    with open(file_path, "r") as f:
        lines = f.readlines()
        
    with open(file_path, "w") as f:
        for line in lines:
            if "create(op.get_bind(), checkfirst=True)" in line:
                f.write("# " + line)
            else:
                f.write(line)
print("Fixed migrations.")
