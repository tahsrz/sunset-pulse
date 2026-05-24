using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

class Program
{
    static void Main(string[] args)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = "\"C:\\Users\\Taz\\SunsetPulse\\packages\\prisma\\run-enum-generator.js\"",
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        using (var process = Process.Start(psi))
        {
            var taskIn = Task.Factory.StartNew(() => {
                CopyStreamWithFlush(Console.OpenStandardInput(), process.StandardInput.BaseStream);
                try { process.StandardInput.Close(); } catch {}
            });
            var taskOut = Task.Factory.StartNew(() => {
                CopyStreamWithFlush(process.StandardOutput.BaseStream, Console.OpenStandardOutput());
            });
            var taskErr = Task.Factory.StartNew(() => {
                CopyStreamWithFlush(process.StandardError.BaseStream, Console.OpenStandardError());
            });

            process.WaitForExit();
            Environment.Exit(process.ExitCode);
        }
    }

    static void CopyStreamWithFlush(Stream source, Stream destination)
    {
        try
        {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = source.Read(buffer, 0, buffer.Length)) > 0)
            {
                destination.Write(buffer, 0, bytesRead);
                destination.Flush();
            }
        }
        catch {}
    }
}
