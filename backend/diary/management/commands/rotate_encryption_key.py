import logging
from django.core.management.base import BaseCommand
from cryptography.fernet import Fernet
from diary.models import Diary

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Rotates the Diary Encryption Key by re-encrypting all diary contents.'

    def add_arguments(self, parser):
        parser.add_argument('--old-key', type=str, required=True, help='Current (Old) Encryption Key')
        parser.add_argument('--new-key', type=str, required=True, help='New Encryption Key')
        parser.add_argument('--dry-run', action='store_true', help='Simulate without saving changes')

    def handle(self, *args, **options):
        old_key = options['old-key']
        new_key = options['new-key']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING("Running in DRY RUN mode. No changes will be saved."))

        # 1. Initialize Fernet for both keys
        try:
            fernet_old = self._get_fernet(old_key)
            fernet_new = self._get_fernet(new_key)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Key initialization failed: {e}"))
            return

        diaries = Diary.objects.all()
        total = diaries.count()
        self.stdout.write(f"Found {total} diaries to process.")

        success_count = 0
        skip_count = 0
        fail_count = 0

        for diary in diaries:
            try:
                # 2. Decrypt with OLD key
                if not diary.content:
                    skip_count += 1
                    continue
                    
                # Check if it looks encrypted (starts with gAAAAA)
                # If not sure, try decrypting anyway.
                if not diary.content.startswith('gAAAAA'):
                    self.stdout.write(f"Diary {diary.id}: Content seems unencrypted. Skipping.")
                    skip_count += 1
                    continue

                try:
                    decrypted_text = fernet_old.decrypt(diary.content.encode('utf-8')).decode('utf-8')
                except Exception:
                    self.stdout.write(self.style.ERROR(f"Diary {diary.id}: Decryption failed with OLD key."))
                    fail_count += 1
                    continue

                # 3. Encrypt with NEW key
                encrypted_text = fernet_new.encrypt(decrypted_text.encode('utf-8')).decode('utf-8')

                # 4. Save (if not dry run)
                if not dry_run:
                    # Update directly to avoid calling 'save()' logic (signals etc) if we want pure data migration
                    # But here we just update the content field.
                    # We use update() on queryset to avoid signals? 
                    # No, we are looping. save() might modify 'updated_at' or trigger embeddings.
                    # Triggering embedding update is fine, but unnecessary since content didn't change logically.
                    # Use queryset update to be safe and fast.
                    Diary.objects.filter(id=diary.id).update(content=encrypted_text)
                
                success_count += 1
                if success_count % 100 == 0:
                    self.stdout.write(f"Processed {success_count}/{total}...")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Diary {diary.id}: Unexpected error: {e}"))
                fail_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nRotation Complete.\n"
            f"Total: {total}\n"
            f"Success: {success_count}\n"
            f"Skipped: {skip_count}\n"
            f"Failed: {fail_count}\n"
        ))
        
        if dry_run:
            self.stdout.write(self.style.WARNING("This was a dry run. No data was changed."))

    def _get_fernet(self, key_str):
        import base64
        # Handle 44 char check for URL safe base64
        if len(key_str) != 44:
            key_bytes = key_str.encode()[:32].ljust(32, b'\0')
            key_str = base64.urlsafe_b64encode(key_bytes).decode()
        return Fernet(key_str.encode())
