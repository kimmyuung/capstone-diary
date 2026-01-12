#!/bin/bash

while true; do
    clear
    echo "================================================="
    echo "      Capstone Diary Docker Manager"
    echo "================================================="
    echo "1. Start (No Build)"
    echo "2. Build & Start (Recommended for updates)"
    echo "3. Stop Containers"
    echo "4. Restart Containers"
    echo "5. View Logs"
    echo "6. Backend Shell (Access Container)"
    echo "7. Clean Up (Prune System)"
    echo "8. Exit"
    echo "================================================="
    read -p "Select an option (1-8): " choice

    case $choice in
        1)
            echo "Starting containers..."
            docker-compose up -d
            ;;
        2)
            echo "Building and starting containers..."
            docker-compose up -d --build
            ;;
        3)
            echo "Stopping containers..."
            docker-compose down
            ;;
        4)
            echo "Restarting containers..."
            docker-compose down
            docker-compose up -d
            ;;
        5)
            echo "Showing logs (Ctrl+C to exit logs)..."
            docker-compose logs -f
            ;;
        6)
            echo "Accessing backend container shell..."
            docker-compose exec web bash
            ;;
        7)
            echo "Pruning docker system..."
            docker system prune -a
            ;;
        8)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            ;;
    esac
    read -p "Press Enter to continue..."
done
