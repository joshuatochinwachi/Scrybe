import sys
import bcrypt

def generate_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pwd = sys.argv[1]
    else:
        pwd = input("Enter password to hash for APP_PASSWORD_HASH: ").strip()
    
    if not pwd:
        print("Password cannot be empty.")
        sys.exit(1)

    hashed = generate_hash(pwd)
    print("\n=======================================================")
    print("Generated bcrypt Hash for APP_PASSWORD_HASH:")
    print(hashed)
    print("=======================================================\n")
