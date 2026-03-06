Set objShell = CreateObject("WScript.Shell")
objShell.CurrentDirectory = "c:\Users\91873\Restaurent Website"
objShell.Run "cmd /c node server.js > server.log 2>&1", 0, False
