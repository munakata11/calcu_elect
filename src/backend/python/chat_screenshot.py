            # ESCキーでキャンセル
            canvas.bind('<Escape>', lambda e: root.quit())
        
        root.mainloop()

if __name__ == "__main__":
    capture_screen() 