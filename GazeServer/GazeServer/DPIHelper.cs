using System;
using System.Drawing;
using System.Runtime.InteropServices;

namespace GazeServer
{
    /// <summary>
    /// Taken from <a href="https://stackoverflow.com/a/21450169/2361752">StackOverflow</a>.
    /// </summary>
    class DPIHelper
    {
        [DllImport("gdi32.dll")]
        static extern int GetDeviceCaps(IntPtr hdc, int nIndex);

        /// <summary>
        /// See <a href="http://pinvoke.net/default.aspx/gdi32/GetDeviceCaps.html">GetDeviceCaps</a>.
        /// </summary>
        private enum DeviceCap : int
        {
            VERTRES = 10,
            DESKTOPVERTRES = 117
        }

        public static float GetScreenScale()
        {
            Graphics g = Graphics.FromHwnd(IntPtr.Zero);
            IntPtr desktop = g.GetHdc();
            int LogicalScreenHeight = GetDeviceCaps(desktop, (int)DeviceCap.VERTRES);
            int PhysicalScreenHeight = GetDeviceCaps(desktop, (int)DeviceCap.DESKTOPVERTRES);

            float scale = (float)PhysicalScreenHeight / (float)LogicalScreenHeight;
            return scale;
        }
    }
}
